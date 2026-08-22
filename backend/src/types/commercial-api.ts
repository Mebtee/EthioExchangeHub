/**
 * Commercial API domain types (Phase 4).
 *
 * These describe what a paying customer's API key resolves to on every
 * `/public/*` request. The context carries ONLY identifiers and plan limits —
 * never the key secret, its hash, or internal bookkeeping columns.
 */

/** Everything downstream handlers/middleware need about the caller. */
export interface CommercialApiContext {
  /** `api_keys.id` — metering + rate-limit identity. */
  apiKeyId: string;
  /** Owning `customers.id` — never derived from client input. */
  customerId: string;
  /** The active subscription backing this request. */
  subscriptionId: string;
  /** The subscription's plan. */
  planId: string;
  /** Plan slug (e.g. "starter") — useful for support diagnostics only. */
  planSlug: string;
  /** Plan-enforced limits for THIS request's middleware chain. */
  requestsPerMinute: number;
  monthlyRequestLimit: number;
  /** Start of the subscription's current billing period (usage-period key). */
  currentPeriodStart: string;
}
