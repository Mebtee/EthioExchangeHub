/**
 * Customer developer-portal types (Phase 6).
 *
 * These mirror the backend's customer-facing views 1:1 (the services already
 * return camelCase), so no row adapters are needed — unlike the admin surface
 * whose rows are snake_case. Backend values are always authoritative; the UI
 * never derives billing/subscription numbers locally.
 */

/** `GET /customer/plans` item — active plans in catalog order. */
export interface CustomerPlan {
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

/** Subscription lifecycle statuses used by badges and gating logic. */
export type CustomerSubscriptionStatus =
  "pending" | "active" | "suspended" | "expired" | "cancelled";

/** `GET /customer/subscription` — the latest subscription of any status. */
export interface CustomerSubscription {
  id: string;
  planId: string;
  status: CustomerSubscriptionStatus | string;
  startsAt: string | null;
  endsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

/** `GET /customer/api-keys` item — prefix only, never the secret or hash. */
export interface CustomerApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** `POST /customer/api-keys` response — carries the secret EXACTLY ONCE. */
export interface CreatedCustomerApiKey extends CustomerApiKey {
  /** Complete `eeh_live_…` secret — transient UI state only, never persisted. */
  key: string;
}

export interface CreateCustomerApiKeyPayload {
  name: string;
  /** Optional ISO 8601 expiration timestamp. */
  expiresAt?: string;
}

/** `GET /customer/payment-methods` item — active bank accounts for transfers. */
export interface CustomerPaymentMethod {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchName: string | null;
  instructions: string | null;
}

/** Payment statuses returned by the backend (Phase 3). */
export type CustomerPaymentStatus =
  "pending" | "under_review" | "approved" | "rejected" | "cancelled";

/** `GET /customer/payments` item. */
export interface CustomerPayment {
  id: string;
  paymentReference: string;
  subscriptionId: string | null;
  planId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: CustomerPaymentStatus | string;
  customerTransactionRef: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitCustomerPaymentPayload {
  subscriptionId: string;
  /** Reference number printed on the customer's bank transfer slip. */
  customerTransactionRef: string;
}

/** `POST /customer/payments/:id/receipt` result — storage paths stay private. */
export interface CustomerReceiptUploadResult {
  id: string;
  paymentId: string;
  originalFilename: string | null;
  mimeType: string;
  uploadedAt: string;
}

/** Per-key usage line inside the usage payload. */
export interface CustomerUsageKey {
  id: string;
  name: string;
  keyPrefix: string;
  requestsUsed: number;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

/** The subscription + plan context usage is measured against. */
export interface CustomerUsageSubscription {
  subscriptionId: string;
  status: string;
  planName: string;
  planSlug: string;
  monthlyRequestLimit: number;
  requestsPerMinute: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

/** `GET /customer/usage` payload — zeroed with null limits when unsubscribed. */
export interface CustomerUsage {
  subscription: CustomerUsageSubscription | null;
  monthlyLimit: number | null;
  requestsUsed: number;
  requestsRemaining: number | null;
  keys: CustomerUsageKey[];
}

/** `GET /customer/usage/:id` — per-key consumption detail. */
export interface CustomerKeyUsage {
  key: Omit<CustomerUsageKey, "requestsUsed"> & { createdAt: string };
  monthlyLimit: number | null;
  requestsUsed: number;
  requestsRemaining: number | null;
  currentPeriodStart: string | null;
}
