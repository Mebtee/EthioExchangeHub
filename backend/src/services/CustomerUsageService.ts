import { NotFoundError } from "@/lib/errors";
import type { ApiKeysRepository } from "@/repositories/ApiKeysRepository";
import type { ApiPlansRepository } from "@/repositories/ApiPlansRepository";
import type { ApiUsageRepository } from "@/repositories/ApiUsageRepository";
import type { CustomersRepository } from "@/repositories/CustomersRepository";
import type { SubscriptionsRepository } from "@/repositories/SubscriptionsRepository";
import type { ApiKeyRow } from "@/types/database";

/**
 * Customer usage analytics (Phase 4, Part K).
 *
 * Answers "what am I using?" for the authenticated customer: plan limits,
 * period consumption across ALL their keys, and per-key breakdowns.
 * Ownership is always resolved from the JWT subject (`users.id`) — no client
 * parameter can select another customer's data, and `key_hash`/full secrets
 * are structurally absent from every view.
 */

/** Per-key consumption line for the current billing period. */
export interface UsageKeyView {
  id: string;
  name: string;
  /** Public prefix only — never the secret, never the hash. */
  keyPrefix: string;
  requestsUsed: number;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

/** The subscription + plan context the usage is measured against. */
export interface UsageSubscriptionView {
  subscriptionId: string;
  status: string;
  planName: string;
  planSlug: string;
  monthlyRequestLimit: number;
  requestsPerMinute: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

/** Full response payload of `GET /customer/usage`. */
export interface CustomerUsageView {
  subscription: UsageSubscriptionView | null;
  monthlyLimit: number | null;
  requestsUsed: number;
  requestsRemaining: number | null;
  keys: UsageKeyView[];
}

/** Payload of `GET /customer/usage/:apiKeyId`. */
export interface KeyUsageView {
  key: Omit<UsageKeyView, "requestsUsed"> & { createdAt: string };
  monthlyLimit: number | null;
  requestsUsed: number;
  requestsRemaining: number | null;
  currentPeriodStart: string | null;
}

/** Public contract of the customer usage service. */
export interface CustomerUsageService {
  getUsage(userId: string): Promise<CustomerUsageView>;
  getKeyUsage(userId: string, apiKeyId: string): Promise<KeyUsageView>;
}

export class CustomerUsageServiceImpl implements CustomerUsageService {
  constructor(
    private readonly customersRepository: CustomersRepository,
    private readonly apiKeysRepository: ApiKeysRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly apiPlansRepository: ApiPlansRepository,
    private readonly apiUsageRepository: ApiUsageRepository,
  ) {}

  async getUsage(userId: string): Promise<CustomerUsageView> {
    const customer = await this.customersRepository.findByUserId(userId);
    if (!customer) {
      // Freshly registered users have no customer profile (and thus never a
      // subscription) until their first plan activation — report zeroed usage
      // so dashboards render before purchase instead of answering 404.
      return {
        subscription: null,
        monthlyLimit: null,
        requestsUsed: 0,
        requestsRemaining: null,
        keys: [],
      };
    }
    const keys = await this.apiKeysRepository.findByCustomer(customer.id);

    const activeSubscription = await this.subscriptionsRepository.findLatestActiveByCustomer(
      customer.id,
    );

    if (!activeSubscription) {
      // No active subscription: report zeroed usage instead of erroring so
      // dashboards render before purchase; limits stay null ("no plan").
      return {
        subscription: null,
        monthlyLimit: null,
        requestsUsed: 0,
        requestsRemaining: null,
        keys: keys.map((key) => CustomerUsageServiceImpl.toKeyView(key, 0)),
      };
    }

    const plan = await this.apiPlansRepository.findById(activeSubscription.plan_id);
    if (!plan) throw new NotFoundError("Plan not found.");
    const periodStart = activeSubscription.current_period_start ?? "";

    const counts = await Promise.all(
      keys.map((key) =>
        this.apiUsageRepository
          .findByKeyAndPeriod(key.id, periodStart)
          .then((row) => row?.request_count ?? 0),
      ),
    );
    const used = counts.reduce((sum, count) => sum + count, 0);

    return {
      subscription: {
        subscriptionId: activeSubscription.id,
        status: activeSubscription.status,
        planName: plan.name,
        planSlug: plan.slug,
        monthlyRequestLimit: plan.monthly_request_limit,
        requestsPerMinute: plan.requests_per_minute,
        currentPeriodStart: activeSubscription.current_period_start!,
        currentPeriodEnd: activeSubscription.current_period_end!,
      },
      monthlyLimit: plan.monthly_request_limit,
      requestsUsed: used,
      requestsRemaining: Math.max(0, plan.monthly_request_limit - used),
      keys: keys.map((key, index) => CustomerUsageServiceImpl.toKeyView(key, counts[index] ?? 0)),
    };
  }

  async getKeyUsage(userId: string, apiKeyId: string): Promise<KeyUsageView> {
    const customer = await this.requireCustomer(userId);
    // Ownership filter in the WHERE clause — foreign ids answer 404.
    const key = await this.apiKeysRepository.findByIdAndCustomer(apiKeyId, customer.id);
    if (!key) throw new NotFoundError("API key not found.");

    const activeSubscription = await this.subscriptionsRepository.findLatestActiveByCustomer(
      customer.id,
    );
    if (!activeSubscription) {
      return {
        key: { ...CustomerUsageServiceImpl.toKeyView(key, 0), createdAt: key.created_at },
        monthlyLimit: null,
        requestsUsed: 0,
        requestsRemaining: null,
        currentPeriodStart: null,
      };
    }

    const plan = await this.apiPlansRepository.findById(activeSubscription.plan_id);
    if (!plan) throw new NotFoundError("Plan not found.");
    const periodStart = activeSubscription.current_period_start ?? "";

    const usage = await this.apiUsageRepository.findByKeyAndPeriod(key.id, periodStart);
    const used = usage?.request_count ?? 0;

    return {
      key: { ...CustomerUsageServiceImpl.toKeyView(key, used), createdAt: key.created_at },
      monthlyLimit: plan.monthly_request_limit,
      requestsUsed: used,
      requestsRemaining: Math.max(0, plan.monthly_request_limit - used),
      currentPeriodStart: activeSubscription.current_period_start,
    };
  }

  private async requireCustomer(userId: string) {
    const customer = await this.customersRepository.findByUserId(userId);
    if (!customer) throw new NotFoundError("Customer profile not found.");
    return customer;
  }

  private static toKeyView(key: ApiKeyRow, requestsUsed: number): UsageKeyView {
    return {
      id: key.id,
      name: key.name,
      keyPrefix: key.key_prefix,
      requestsUsed,
      lastUsedAt: key.last_used_at,
      revokedAt: key.revoked_at,
    };
  }
}
