import { ConflictError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { ApiPlansRepository } from "@/repositories/ApiPlansRepository";
import type { CustomersRepository } from "@/repositories/CustomersRepository";
import type { SubscriptionsRepository } from "@/repositories/SubscriptionsRepository";
import type { ApiPlanRow, SubscriptionRow } from "@/types/database";
import { nowIso } from "@/utils/date";

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
  /** The authenticated customer's latest subscription (any status), or 404. */
  getSubscription(userId: string): Promise<SubscriptionView>;
  /** Selects a plan; free plans activate immediately, paid plans stay pending. */
  createSubscription(userId: string, input: CreateSubscriptionInput): Promise<SubscriptionView>;
}

/**
 * Subscription statuses that BLOCK selecting a new plan. `expired` and
 * `cancelled` are terminal and therefore allow re-selection (history is
 * preserved — rows are never deleted or rewritten).
 */
const BLOCKING_STATUSES = new Set(["pending", "active", "suspended"]);

/** ISO timestamp one month after the given ISO time (UTC arithmetic). */
function addOneMonthIso(iso: string): string {
  const date = new Date(iso);
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  ).toISOString();
}

/**
 * Customer plan/subscription business logic (Phase 2C).
 *
 * BACKEND-CONTROLLED FIELDS: the client supplies ONLY `plan_id`. Status,
 * price, currency, and billing periods are derived server-side from the plan
 * row and the JWT-resolved customer identity — mass assignment is impossible.
 *
 * ACTIVATION MODEL (matches the schema documented in types/database.ts):
 *   - Free plans (price = 0) need no payment, so selection activates them
 *     immediately (`status = "active"` + first billing period stamped).
 *   - Paid plans create a `pending` subscription ONLY. Manual bank-transfer
 *     review (later phase) flips it to active after admin approval.
 *
 * DUPLICATES: at most one non-terminal subscription per customer; re-selecting
 * while one is pending/active/suspended answers 409. Terminal subscriptions
 * remain in history and new rows are always INSERTs.
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
    const subscription = await this.subscriptionsRepository.findLatestByCustomer(customer.id);
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

    const existing = await this.subscriptionsRepository.findLatestByCustomer(customer.id);
    if (existing && BLOCKING_STATUSES.has(existing.status)) {
      throw new ConflictError(
        `You already have a ${existing.status} subscription. Complete or cancel it before selecting another plan.`,
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
