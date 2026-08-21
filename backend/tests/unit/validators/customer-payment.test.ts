import { describe, expect, it } from "vitest";

import {
  bankConfigIdParamsSchema,
  createBankConfigBodySchema,
  createPaymentBodySchema,
  listPaymentsQuerySchema,
  paymentIdParamsSchema,
  reviewPaymentBodySchema,
  updateBankConfigBodySchema,
} from "@/validators/customer-payment";

const SUBSCRIPTION_ID = "cccccccc-cccc-4ccc-8ccc-000000000001";
const PAYMENT_ID = "dddddddd-dddd-4ddd-8ddd-000000000001";

describe("createPaymentBodySchema", () => {
  it("accepts subscription_id + customer_transaction_ref only", () => {
    const parsed = createPaymentBodySchema.safeParse({
      subscription_id: SUBSCRIPTION_ID,
      customer_transaction_ref: "BANK-REF-1001",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.customer_transaction_ref).toBe("BANK-REF-1001");
  });

  it("rejects missing/short/non-uuid fields", () => {
    for (const body of [
      {},
      { customer_transaction_ref: "REF" },
      { subscription_id: SUBSCRIPTION_ID },
      { subscription_id: SUBSCRIPTION_ID, customer_transaction_ref: "ab" },
      { subscription_id: "not-a-uuid", customer_transaction_ref: "BANK-REF-1001" },
    ]) {
      expect(createPaymentBodySchema.safeParse(body).success).toBe(false);
    }
  });

  it("rejects mass assignment of server-controlled money fields", () => {
    for (const extra of [
      { amount: 1 },
      { currency: "USD" },
      { status: "approved" },
      { plan_id: "aaaaaaaa-aaaa-4aaa-8aaa-000000000001" },
      { customer_id: "11111111-1111-4111-8111-111111111111" },
      { payment_reference: "EEH-PAY-HACKED" },
      { reviewed_by: "77777777-7777-4777-8777-777777777777" },
    ]) {
      const result = createPaymentBodySchema.safeParse({
        subscription_id: SUBSCRIPTION_ID,
        customer_transaction_ref: "BANK-REF-1001",
        ...extra,
      });
      expect(result.success).toBe(false);
    }
  });
});

describe("reviewPaymentBodySchema", () => {
  it("accepts approve and under_review without a reason", () => {
    expect(reviewPaymentBodySchema.safeParse({ action: "approve" }).success).toBe(true);
    expect(reviewPaymentBodySchema.safeParse({ action: "under_review" }).success).toBe(true);
  });

  it("requires rejection_reason ONLY when rejecting", () => {
    expect(reviewPaymentBodySchema.safeParse({ action: "reject" }).success).toBe(false);
    expect(
      reviewPaymentBodySchema.safeParse({ action: "reject", rejection_reason: "" }).success,
    ).toBe(false);
    expect(
      reviewPaymentBodySchema.safeParse({
        action: "reject",
        rejection_reason: "Receipt unreadable",
      }).success,
    ).toBe(true);
  });

  it("rejects unknown actions and unknown keys", () => {
    expect(reviewPaymentBodySchema.safeParse({ action: "activate" }).success).toBe(false);
    expect(
      reviewPaymentBodySchema.safeParse({ action: "approve", status: "approved" }).success,
    ).toBe(false);
  });
});

describe("param/query schemas", () => {
  it("paymentIdParamsSchema accepts UUID ids only", () => {
    expect(paymentIdParamsSchema.safeParse({ id: PAYMENT_ID }).success).toBe(true);
    expect(paymentIdParamsSchema.safeParse({ id: "nope" }).success).toBe(false);
  });

  it("listPaymentsQuerySchema validates the status filter", () => {
    expect(listPaymentsQuerySchema.safeParse({}).success).toBe(true);
    expect(listPaymentsQuerySchema.safeParse({ status: "pending" }).success).toBe(true);
    expect(listPaymentsQuerySchema.safeParse({ status: "rich" }).success).toBe(false);
    expect(listPaymentsQuerySchema.safeParse({ customer_id: "x" }).success).toBe(false); // isolation
  });
});

describe("bank config schemas", () => {
  it("create requires the core account fields", () => {
    expect(
      createBankConfigBodySchema.safeParse({
        bank_name: "CBE",
        account_name: "EthioExchange PLC",
        account_number: "1000123456789",
      }).success,
    ).toBe(true);
    expect(createBankConfigBodySchema.safeParse({ bank_name: "CBE" }).success).toBe(false);
    expect(
      createBankConfigBodySchema.safeParse({
        bank_name: "CBE",
        account_name: "EthioExchange",
        account_number: "1000123456789",
        is_active: true, // not client-settable at creation
      }).success,
    ).toBe(false);
  });

  it("update requires at least one field and allows is_active toggling", () => {
    expect(updateBankConfigBodySchema.safeParse({}).success).toBe(false);
    expect(updateBankConfigBodySchema.safeParse({ is_active: false }).success).toBe(true);
    expect(updateBankConfigBodySchema.safeParse({ branch_name: null }).success).toBe(true);
    expect(bankConfigIdParamsSchema.safeParse({ id: BANK_ID }).success).toBe(true);
  });
});

const BANK_ID = "bbbbbbbb-bbbb-4bbb-8bbb-000000000001";
