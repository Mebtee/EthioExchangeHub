import { apiClient } from "./client";
import type {
  CreatedCustomerApiKey,
  CreateCustomerApiKeyPayload,
  CustomerApiKey,
  CustomerKeyUsage,
  CustomerPayment,
  CustomerPaymentMethod,
  CustomerPlan,
  CustomerReceiptUploadResult,
  CustomerSubscription,
  CustomerUsage,
  SubmitCustomerPaymentPayload,
} from "@/types/customer";

/**
 * Customer developer-portal API service (Phase 6).
 *
 * Thin wrappers over the existing Phase 2A–4 endpoints. The axios response
 * interceptor already unwraps the `{ success, message, data }` envelope and
 * preserves backend error messages, so every failure surfaces with its real,
 * meaningful message (e.g. "Maximum API keys reached").
 */

// ---- Registration (public, Phase 2A) ----

export interface RegisterPayload {
  email: string;
  password: string;
  companyName?: string;
  phone?: string;
}

/** POST /auth/register — creates the customer account (role "customer"). */
export async function registerCustomer(payload: RegisterPayload): Promise<void> {
  await apiClient.post("/auth/register", {
    email: payload.email,
    password: payload.password,
    ...(payload.companyName ? { company_name: payload.companyName } : {}),
    ...(payload.phone ? { phone: payload.phone } : {}),
  });
}

// ---- Plans & subscription (Phases 2C/3) ----

/** GET /customer/plans — active plans in catalog order. */
export async function fetchCustomerPlans(): Promise<CustomerPlan[]> {
  const { data } = await apiClient.get<CustomerPlan[]>("/customer/plans");
  return data;
}

/** GET /customer/subscription — latest subscription of any status (404 when none). */
export async function fetchCustomerSubscription(): Promise<CustomerSubscription> {
  const { data } = await apiClient.get<CustomerSubscription>("/customer/subscription");
  return data;
}

/** POST /customer/subscription — select a plan (body key is `plan_id`). */
export async function createCustomerSubscription(planId: string): Promise<CustomerSubscription> {
  const { data } = await apiClient.post<CustomerSubscription>("/customer/subscription", {
    plan_id: planId,
  });
  return data;
}

// ---- API keys (Phase 2B; secret shown exactly once at creation) ----

/** POST /customer/api-keys — the response's `key` field is shown ONCE. */
export async function createCustomerApiKey(
  payload: CreateCustomerApiKeyPayload,
): Promise<CreatedCustomerApiKey> {
  const { data } = await apiClient.post<CreatedCustomerApiKey>("/customer/api-keys", {
    name: payload.name,
    ...(payload.expiresAt ? { expires_at: payload.expiresAt } : {}),
  });
  return data;
}

/** GET /customer/api-keys — prefixes only. */
export async function fetchCustomerApiKeys(): Promise<CustomerApiKey[]> {
  const { data } = await apiClient.get<CustomerApiKey[]>("/customer/api-keys");
  return data;
}

/** DELETE /customer/api-keys/:id — idempotent revocation. */
export async function revokeCustomerApiKey(keyId: string): Promise<void> {
  await apiClient.delete(`/customer/api-keys/${keyId}`);
}

// ---- Manual bank-transfer payments (Phase 3) ----

/** GET /customer/payment-methods — ACTIVE bank accounts only. */
export async function fetchCustomerPaymentMethods(): Promise<CustomerPaymentMethod[]> {
  const { data } = await apiClient.get<CustomerPaymentMethod[]>("/customer/payment-methods");
  return data;
}

/** POST /customer/payments — submit reference for a PENDING subscription. */
export async function submitCustomerPayment(
  payload: SubmitCustomerPaymentPayload,
): Promise<CustomerPayment> {
  const { data } = await apiClient.post<CustomerPayment>("/customer/payments", {
    subscription_id: payload.subscriptionId,
    customer_transaction_ref: payload.customerTransactionRef,
  });
  return data;
}

/** GET /customer/payments — newest first. */
export async function fetchCustomerPayments(): Promise<CustomerPayment[]> {
  const { data } = await apiClient.get<CustomerPayment[]>("/customer/payments");
  return data;
}

/**
 * POST /customer/payments/:id/receipt — multipart upload, field `receipt`.
 * Backend validates magic bytes + size (PNG/JPEG/WEBP/PDF, max 5 MB).
 */
export async function uploadCustomerReceipt(
  paymentId: string,
  file: File,
): Promise<CustomerReceiptUploadResult> {
  const form = new FormData();
  form.append("receipt", file);
  const { data } = await apiClient.post<CustomerReceiptUploadResult>(
    `/customer/payments/${paymentId}/receipt`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

// ---- Usage analytics (Phase 4) ----

/** GET /customer/usage — limits + current-period consumption across keys. */
export async function fetchCustomerUsage(): Promise<CustomerUsage> {
  const { data } = await apiClient.get<CustomerUsage>("/customer/usage");
  return data;
}

/** GET /customer/usage/:id — per-key consumption detail (ownership enforced backend-side). */
export async function fetchCustomerKeyUsage(keyId: string): Promise<CustomerKeyUsage> {
  const { data } = await apiClient.get<CustomerKeyUsage>(`/customer/usage/${keyId}`);
  return data;
}
