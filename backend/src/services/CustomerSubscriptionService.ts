import { ConflictError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { ApiPlansRepository } from "@/repositories/ApiPlansRepository";
import type { CustomersRepository } from "@/repositories/CustomersRepository";
import type { SubscriptionsRepository } from "@/repositories/SubscriptionsRepository";
import type { ApiPlanRow, SubscriptionRow } from "@/types/database";
import { addOneMonthIso, nowIso } from "@/utils/date";

/** Input for plan selection (validated upstream by the Zod schema). */
export interface CreateSubscriptionInput {
  planId: string;
}

/** Customer-facing plan view — catalog information only. */
export interface PlanView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  billingInterval: string;
  monthlyRequestLimit: number;
  requestsPerMinute: number;
  maxApiKeys: number;
  displayOrder: number;
}

/** Customer-facing subscription view — no internal bookkeeping beyond status. */
export interface SubscriptionView {
  id: string;
  /** The selected plan — lets clients resolve limits without another call. */
  planId: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Public contract of the customer subscription service. */
export interface CustomerSubscriptionService {
  /** Active plans in catalog order. */
  getPlans(): Promise<PlanView[]>;
  /** The customer's effective subscription — latest ACTIVE row, else latest overall; 404 when none. */
  getSubscription(userId: string): Promise<SubscriptionView>;
  /**
   * Selects a plan. Free selections with no active subscription activate
   * immediately; upgrades create a pending subscription paid by bank transfer.
   */
  createSubscription(userId: string, input: CreateSubscriptionInput): Promise<SubscriptionView>;
}

/**
 * Customer plan/subscription business logic (Phase 2C + plan upgrades).
 *
 * BACKEND-CONTROLLED FIELDS: the client supplies ONLY `plan_id`. Status,
 * price, currency, and billing periods are derived server-side from the plan
 * row and the JWT-resolved customer identity — mass assignment is impossible.
 *
 * ACTIVATION MODEL (matches the schema documented in types/database.ts):
 *   - Free plans (price = 0) need no payment, so selection activates them
 *     immediately (`status = "active"` + first billing period stamped).
 *   - Paid plans create a `pending` subscription ONLY. Manual bank-transfer
 *     review flips it to active after admin approval.
 *
 * UPGRADES (price-based tiering): an active subscription does NOT block
 * selection — customers may move to a strictly more expensive plan at any
 * time (Free → Starter → Business). Same-plan re-selection and downgrades
 * are refused with 409; only one pending upgrade may exist at a time, and a
 * suspended subscription blocks everything until an admin resolves it.
 * Terminal rows (expired/cancelled) never block. History is preserved —
 * rows are never deleted or rewritten; on approval the older ACTIVE rows are
 * superseded (see AdminPaymentService).
 *
 * NO SUBSCRIPTION IS EVER INVENTED: reads answer 404 when the customer has
 * none — creation happens exclusively through explicit plan selection.
 */
export class CustomerSubscriptionServiceImpl implements CustomerSubscriptionService {
  constructor(
    private readonly customersRepository: CustomersRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly apiPlansRepository: ApiPlansRepository,
  ) {}

  async getPlans(): Promise<PlanView[]> {
    const plans = await this.apiPlansRepository.findActiveOrdered();
    return plans.map((plan) => CustomerSubscriptionServiceImpl.toPlanView(plan));
  }

  async getSubscription(userId: string): Promise<SubscriptionView> {
    const customer = await this.requireCustomer(userId);
    // The ACTIVE subscription is the customer's effective plan even while an
    // upgrade is pending; without one, fall back to the latest row overall.
    const subscription =
      (await this.subscriptionsRepository.findLatestActiveByCustomer(customer.id)) ??
      (await this.subscriptionsRepository.findLatestByCustomer(customer.id));
    if (!subscription) {
      throw new NotFoundError("No subscription found. Select a plan to get started.");
    }
    return CustomerSubscriptionServiceImpl.toView(subscription);
  }

  async createSubscription(
    userId: string,
    input: CreateSubscriptionInput,
  ): Promise<SubscriptionView> {
    const customer = await this.requireCustomer(userId);

    // Invalid ids and inactive plans fail differently: an unknown plan does
    // not exist (404); a known-but-unavailable plan is a state conflict (409).
    const plan = await this.apiPlansRepository.findById(input.planId);
    if (!plan) throw new NotFoundError("Plan not found.");
    if (!plan.is_active) {
      throw new ConflictError("This plan is currently unavailable.");
    }

    // One history read derives every rule input. `listByCustomer` returns
    // oldest→newest, so the last match is the latest of its kind.
    const history = await this.subscriptionsRepository.listByCustomer(customer.id);
    const active = [...history].reverse().find((row) => row.status === "active") ?? null;
    const hasPending = history.some((row) => row.status === "pending");
    const isSuspended = history.some((row) => row.status === "suspended");

    if (isSuspended) {
      throw new ConflictError(
        "Your account is suspended. Contact support before selecting another plan.",
      );
    }

    if (active) {
      // An active subscription only allows strictly higher tiers, and never
      // while another upgrade already awaits payment approval.
      if (hasPending) {
        throw new ConflictError(
          "You already have an upgrade awaiting payment. Complete it from the Payments page before selecting another plan.",
        );
      }
      const currentPlan = await this.apiPlansRepository.findById(active.plan_id);
      // Defensive: an active row always references a live catalog entry; if it
      // was removed the account needs admin support rather than a silent fix.
      if (!currentPlan) {
        throw new ConflictError("Your current plan is unavailable. Please contact support.");
      }
      if (plan.id === currentPlan.id) {
        throw new ConflictError("You are already subscribed to this plan.");
      }
      if (plan.price <= currentPlan.price) {
        throw new ConflictError(
          "Downgrades are not supported yet. Choose a plan above your current tier.",
        );
      }
    } else if (hasPending) {
      throw new ConflictError(
        "You already have a subscription awaiting payment. Complete it from the Payments page before selecting another plan.",
      );
    }

    // Free plans activate immediately; paid plans wait for bank-transfer
    // approval in the payment phase — NEVER auto-activated here.
    const isFree = plan.price === 0;
    const timestamp = nowIso();
    const created = await this.subscriptionsRepository.insert({
      customer_id: customer.id,
      plan_id: plan.id,
      status: isFree ? "active" : "pending",
      starts_at: isFree ? timestamp : null,
      ends_at: null,
      current_period_start: isFree ? timestamp : null,
      current_period_end: isFree ? addOneMonthIso(timestamp) : null,
      cancelled_at: null,
      cancellation_reason: null,
      created_at: timestamp,
      updated_at: timestamp,
    });

    logger.info("Customer selected a plan", {
      subscriptionId: created.id,
      customerId: customer.id,
      planId: plan.id,
      status: created.status,
    });
    return CustomerSubscriptionServiceImpl.toView(created);
  }

  private async requireCustomer(userId: string) {
    const customer = await this.customersRepository.findByUserId(userId);
    if (!customer) throw new NotFoundError("Customer profile not found.");
    return customer;
  }

  private static toPlanView(plan: ApiPlanRow): PlanView {
    return {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      billingInterval: plan.billing_interval,
      monthlyRequestLimit: plan.monthly_request_limit,
      requestsPerMinute: plan.requests_per_minute,
      maxApiKeys: plan.max_api_keys,
      displayOrder: plan.display_order,
    };
  }

  private static toView(row: SubscriptionRow): SubscriptionView {
    return {
      id: row.id,
      planId: row.plan_id,
      status: row.status,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
