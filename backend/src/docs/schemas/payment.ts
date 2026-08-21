import type { OpenAPIV3_1 } from "openapi-types";

/**
 * OpenAPI schemas for the Phase 3 manual bank-transfer payment surface.
 *
 * Customers never control money fields; admin views additionally carry the
 * reviewer identity. Receipt storage paths are internal and appear in no
 * customer-facing schema.
 */

/** ACTIVE bank account shown to customers for manual transfers. */
export const bankAccountSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "An active bank account customers can transfer to.",
  properties: {
    id: { type: "string", format: "uuid" },
    bankName: { type: "string" },
    accountName: { type: "string" },
    accountNumber: { type: "string" },
    branchName: { type: ["string", "null"] },
    instructions: { type: ["string", "null"], description: "Free-form transfer instructions." },
  },
  required: ["id", "bankName", "accountName", "accountNumber", "branchName", "instructions"],
};

/** The customer's own payment record. */
export const customerPaymentSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description:
    "A manual bank-transfer payment submitted by the authenticated customer. Amount, currency, status, and reference are always server-derived.",
  properties: {
    id: { type: "string", format: "uuid" },
    paymentReference: {
      type: "string",
      description: 'System-generated reference (e.g. "EEH-PAY-20260821-A1B2C3D4").',
    },
    subscriptionId: { type: ["string", "null"], format: "uuid" },
    planId: { type: "string", format: "uuid" },
    amount: { type: "number", description: "Copied server-side from the plan price." },
    currency: { type: "string", description: 'ISO 4217 code copied from the plan (e.g. "ETB").' },
    paymentMethod: { type: "string", description: 'Currently always "bank_transfer".' },
    status: {
      type: "string",
      enum: ["pending", "under_review", "approved", "rejected", "cancelled"],
    },
    customerTransactionRef: {
      type: "string",
      description: "The reference number the customer read off their bank slip.",
    },
    submittedAt: { type: ["string", "null"], format: "date-time" },
    reviewedAt: { type: ["string", "null"], format: "date-time" },
    rejectionReason: { type: ["string", "null"], description: "Set only when rejected." },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
  required: [
    "id",
    "paymentReference",
    "subscriptionId",
    "planId",
    "amount",
    "currency",
    "paymentMethod",
    "status",
    "customerTransactionRef",
    "submittedAt",
    "reviewedAt",
    "rejectionReason",
    "createdAt",
    "updatedAt",
  ],
};

/** Request body for `POST /customer/payments`. */
export const submitPaymentInputSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description:
    "The ONLY customer-controlled fields: which pending subscription is being paid and the bank transaction reference printed on the transfer slip. Supplying amount, currency, status, plan_id, customer_id, or review fields is rejected as unknown input.",
  properties: {
    subscription_id: { type: "string", format: "uuid" },
    customer_transaction_ref: { type: "string", minLength: 4, maxLength: 100 },
  },
  required: ["subscription_id", "customer_transaction_ref"],
};

/** Result of a successful receipt upload (no storage path is exposed). */
export const receiptUploadResultSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "Metadata of an uploaded receipt. Files are stored privately; paths stay internal.",
  properties: {
    id: { type: "string", format: "uuid" },
    paymentId: { type: "string", format: "uuid" },
    originalFilename: { type: ["string", "null"] },
    mimeType: {
      type: "string",
      enum: ["image/png", "image/jpeg", "image/webp", "application/pdf"],
    },
    uploadedAt: { type: "string", format: "date-time" },
  },
  required: ["id", "paymentId", "originalFilename", "mimeType", "uploadedAt"],
};

/** Admin view of a payment — includes reviewer identity. */
export const adminPaymentSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "Payment record as seen by admins (includes who reviewed it).",
  properties: {
    id: { type: "string", format: "uuid" },
    customerId: { type: "string", format: "uuid" },
    subscriptionId: { type: ["string", "null"], format: "uuid" },
    planId: { type: "string", format: "uuid" },
    amount: { type: "number" },
    currency: { type: "string" },
    paymentReference: { type: "string" },
    customerTransactionRef: { type: ["string", "null"] },
    paymentMethod: { type: "string" },
    status: {
      type: "string",
      enum: ["pending", "under_review", "approved", "rejected", "cancelled"],
    },
    submittedAt: { type: ["string", "null"], format: "date-time" },
    reviewedAt: { type: ["string", "null"], format: "date-time" },
    reviewedBy: { type: ["string", "null"], format: "uuid", description: "Admin user id." },
    rejectionReason: { type: ["string", "null"] },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
  required: [
    "id",
    "customerId",
    "subscriptionId",
    "planId",
    "amount",
    "currency",
    "paymentReference",
    "customerTransactionRef",
    "paymentMethod",
    "status",
    "submittedAt",
    "reviewedAt",
    "reviewedBy",
    "rejectionReason",
    "createdAt",
    "updatedAt",
  ],
};

/** Request body for `POST /admin/payments/:id/review`. */
export const reviewPaymentInputSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description:
    "Review transition. `under_review` moves a pending payment into review; `approve` ACTIVATES the associated subscription exactly once; `reject` requires a reason visible to the customer.",
  properties: {
    action: { type: "string", enum: ["under_review", "approve", "reject"] },
    rejection_reason: {
      type: "string",
      minLength: 3,
      maxLength: 500,
      description: "Required when action is `reject`.",
    },
  },
  required: ["action"],
};

/** Admin view of a configured bank account (includes inactive ones). */
export const adminBankAccountSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "Full bank account configuration as managed by admins.",
  properties: {
    id: { type: "string", format: "uuid" },
    bankName: { type: "string" },
    accountName: { type: "string" },
    accountNumber: { type: "string" },
    branchName: { type: ["string", "null"] },
    instructions: { type: ["string", "null"] },
    isActive: { type: "boolean", description: "Inactive accounts are hidden from customers." },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
  required: [
    "id",
    "bankName",
    "accountName",
    "accountNumber",
    "branchName",
    "instructions",
    "isActive",
    "createdAt",
    "updatedAt",
  ],
};

/** Request body for `POST /admin/payment-methods`. */
export const createBankAccountInputSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "Creates a new bank account (active by default).",
  properties: {
    bank_name: { type: "string", minLength: 2, maxLength: 120 },
    account_name: { type: "string", minLength: 2, maxLength: 160 },
    account_number: { type: "string", minLength: 4, maxLength: 40 },
    branch_name: { type: "string", minLength: 2, maxLength: 120 },
    instructions: { type: "string", minLength: 5, maxLength: 1000 },
  },
  required: ["bank_name", "account_name", "account_number"],
};

/** Request body for `PATCH /admin/payment-methods/:id`. */
export const updateBankAccountInputSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description:
    "Partial update — at least one field required. Activation/deactivation uses `is_active`.",
  properties: {
    bank_name: { type: "string", minLength: 2, maxLength: 120 },
    account_name: { type: "string", minLength: 2, maxLength: 160 },
    account_number: { type: "string", minLength: 4, maxLength: 40 },
    branch_name: { type: ["string", "null"] },
    instructions: { type: ["string", "null"] },
    is_active: { type: "boolean" },
  },
};

/** Short-lived signed URL response for viewing a private receipt. */
export const receiptUrlResponseSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description:
    "Temporary read URL for a receipt stored in the PRIVATE bucket. Never public; expires quickly.",
  properties: {
    url: { type: "string" },
    expiresInSeconds: { type: "integer", example: 300 },
  },
  required: ["url", "expiresInSeconds"],
};
