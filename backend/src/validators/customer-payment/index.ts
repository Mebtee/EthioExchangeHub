/**
 * Customer payment request validation (Phase 3).
 *
 * Customers control EXACTLY TWO things when submitting a payment: which
 * subscription is being paid for and their bank transaction reference.
 * Everything else — customer_id, plan_id, amount, currency, status,
 * payment_method, payment_reference, review fields — is derived or stamped
 * server-side; strict schemas reject such inputs as unknown keys, so mass
 * assignment is impossible by construction.
 */

import { z } from "zod";

import { trimmedStringSchema, uuidSchema } from "../common";

/** Body for `POST /customer/payments` — payment submission. */
export const createPaymentBodySchema = z
  .object({
    /** The caller's PENDING subscription being paid for (ownership re-checked in the service). */
    subscription_id: uuidSchema,
    /** The reference number printed on the customer's bank transfer slip. */
    customer_transaction_ref: trimmedStringSchema
      .min(4, "must be at least 4 characters")
      .max(100, "must be at most 100 characters"),
  })
  .strict();

export type CreatePaymentBody = z.infer<typeof createPaymentBodySchema>;

/** Route params for customer-scoped single-payment operations (`:id`). */
export const paymentIdParamsSchema = z.object({ id: uuidSchema }).strict();

/** Body for `POST /admin/payments/:id/review`. */
export const reviewPaymentBodySchema = z
  .object({
    action: z.enum(["under_review", "approve", "reject"], {
      errorMap: () => ({ message: "Action must be one of: under_review, approve, reject" }),
    }),
    /** Required when action is "reject" — the reason shown to the customer. */
    rejection_reason: trimmedStringSchema.max(500, "must be at most 500 characters").optional(),
  })
  .strict()
  .refine((body) => body.action !== "reject" || body.rejection_reason !== undefined, {
    message: "A rejection reason is required when rejecting a payment",
    path: ["rejection_reason"],
  });

export type ReviewPaymentBody = z.infer<typeof reviewPaymentBodySchema>;

/** Optional filter query for `GET /admin/payments`. */
export const listPaymentsQuerySchema = z
  .object({
    status: z.enum(["pending", "under_review", "approved", "rejected", "cancelled"]).optional(),
  })
  .strict();

/** Body for `POST /admin/payment-methods` — new bank account. */
export const createBankConfigBodySchema = z
  .object({
    bank_name: trimmedStringSchema.max(120, "must be at most 120 characters"),
    account_name: trimmedStringSchema.max(160, "must be at most 160 characters"),
    account_number: trimmedStringSchema.min(4, "must be at least 4 characters").max(40),
    branch_name: trimmedStringSchema.max(120, "must be at most 120 characters").optional(),
    instructions: trimmedStringSchema.max(1000, "must be at most 1000 characters").optional(),
  })
  .strict();

export type CreateBankConfigBody = z.infer<typeof createBankConfigBodySchema>;

/**
 * Body for `PATCH /admin/payment-methods/:id` — partial update that also
 * carries activate/deactivate via `is_active`; at least one field required.
 */
export const updateBankConfigBodySchema = z
  .object({
    bank_name: trimmedStringSchema.max(120).optional(),
    account_name: trimmedStringSchema.max(160).optional(),
    account_number: trimmedStringSchema.min(4).max(40).optional(),
    branch_name: trimmedStringSchema.max(120).nullable().optional(),
    instructions: trimmedStringSchema.max(1000).nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateBankConfigBody = z.infer<typeof updateBankConfigBodySchema>;

/** Route params for bank-config mutations (`:id`). */
export const bankConfigIdParamsSchema = z.object({ id: uuidSchema }).strict();
