import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConflictError, DatabaseError, NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { ReceiptStorage } from "@/lib/receipt-storage";
import { ApiPlansRepository } from "@/repositories/ApiPlansRepository";
import { BankPaymentConfigRepository } from "@/repositories/BankPaymentConfigRepository";
import { CustomersRepository } from "@/repositories/CustomersRepository";
import { PaymentReceiptsRepository } from "@/repositories/PaymentReceiptsRepository";
import { PaymentsRepository } from "@/repositories/PaymentsRepository";
import { SubscriptionsRepository } from "@/repositories/SubscriptionsRepository";
import { PaymentServiceImpl } from "@/services/PaymentService";
import type { ApiPlanRow, BankPaymentConfigRow, CustomerRow, Database } from "@/types/database";

import { createFakeSupabaseClient } from "../../helpers/supabase-client";

// ---- Deterministic clock -----------------------------------------------------
const NOW = new Date("2026-08-21T12:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.spyOn(logger, "info").mockImplementation(() => undefined);
});

const CUSTOMER_A_USER = "user-a";
const CUSTOMER_B_USER = "user-b";
const CUSTOMER_A = "11111111-1111-4111-8111-111111111111";
const CUSTOMER_B = "22222222-2222-4222-8222-222222222222";

function makeCustomer(overrides: Partial<CustomerRow> = {}): CustomerRow {
  return {
    id: CUSTOMER_A,
    user_id: CUSTOMER_A_USER,
    company_name: null,
    phone: null,
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...overrides,
  };
}

let planSeq = 0;
function makePlan(overrides: Partial<ApiPlanRow> = {}): ApiPlanRow {
  planSeq += 1;
  const id = `aaaaaaaa-aaaa-4aaa-8aaa-${String(planSeq).padStart(12, "0")}`;
  return {
    id,
    name: `Plan ${planSeq}`,
    slug: `plan-${planSeq}`,
    description: null,
    price: 499,
    currency: "ETB",
    billing_interval: "monthly",
    monthly_request_limit: 25_000,
    requests_per_minute: 60,
    max_api_keys: 2,
    is_active: true,
    display_order: planSeq,
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...overrides,
  };
}

interface SeedOptions {
  customers?: CustomerRow[];
  plans?: ApiPlanRow[];
  subscriptions?: Record<string, unknown>[];
  payments?: Record<string, unknown>[];
  bankAccounts?: BankPaymentConfigRow[];
}

/** In-memory receipt storage capturing what would hit the private bucket. */
class FakeReceiptStorage implements ReceiptStorage {
  readonly objects = new Map<string, { content: Buffer; mimeType: string }>();
  async upload(path: string, content: Buffer, mimeType: string): Promise<void> {
    this.objects.set(path, { content, mimeType });
  }
  async signedUrl(path: string): Promise<string> {
    return `https://signed.test/${path}`;
  }
}

function makeService(seed: SeedOptions = {}) {
  const client = createFakeSupabaseClient({
    users: [],
    customers: seed.customers ?? [
      makeCustomer(),
      makeCustomer({ id: CUSTOMER_B, user_id: CUSTOMER_B_USER }),
    ],
    api_plans: seed.plans ?? [],
    subscriptions: seed.subscriptions ?? [],
    payments: seed.payments ?? [],
    payment_receipts: [],
    bank_payment_config: seed.bankAccounts ?? [],
  });
  const supabase = client as unknown as SupabaseClient<Database>;
  const storage = new FakeReceiptStorage();
  const service = new PaymentServiceImpl(
    new CustomersRepository(supabase),
    new SubscriptionsRepository(supabase),
    new ApiPlansRepository(supabase),
    new PaymentsRepository(supabase),
    new PaymentReceiptsRepository(supabase),
    new BankPaymentConfigRepository(supabase),
    storage,
  );
  return { service, client, storage };
}

const ACTIVE_BANK: BankPaymentConfigRow = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-000000000001",
  bank_name: "Commercial Bank of Ethiopia",
  account_name: "EthioExchange PLC",
  account_number: "1000123456789",
  branch_name: "Bole",
  instructions: "Use the payment reference as transfer memo.",
  is_active: true,
  created_at: NOW.toISOString(),
  updated_at: NOW.toISOString(),
};
const INACTIVE_BANK: BankPaymentConfigRow = {
  ...ACTIVE_BANK,
  id: "bbbbbbbb-bbbb-4bbb-8bbb-000000000002",
  bank_name: "Retired Bank",
  is_active: false,
};

describe("PaymentServiceImpl.getPaymentMethods", () => {
  it("returns ACTIVE accounts only, without internal fields", async () => {
    const { service } = makeService({ bankAccounts: [ACTIVE_BANK, INACTIVE_BANK] });

    const methods = await service.getPaymentMethods();

    expect(methods).toHaveLength(1);
    expect(methods[0]).toMatchObject({
      bankName: "Commercial Bank of Ethiopia",
      accountNumber: "1000123456789",
    });
    const serialized = JSON.stringify(methods);
    expect(serialized).not.toContain("is_active");
    expect(serialized).not.toContain("Retired");
  });
});

describe("PaymentServiceImpl.submitPayment", () => {
  it("creates a PENDING payment with amount/currency derived from the PLAN", async () => {
    const starter = makePlan({ name: "Starter", price: 499, currency: "ETB" });
    const subscription = {
      id: "cccccccc-cccc-4ccc-8ccc-000000000001",
      customer_id: CUSTOMER_A,
      plan_id: starter.id,
      status: "pending",
      created_at: NOW.toISOString(),
      updated_at: NOW.toISOString(),
    };
    const { service, client } = makeService({ plans: [starter], subscriptions: [subscription] });

    const view = await service.submitPayment(CUSTOMER_A_USER, {
      subscriptionId: subscription.id,
      customerTransactionRef: "BANK-REF-1001",
    });

    expect(view.status).toBe("pending");
    expect(view.amount).toBe(499); // from the plan, NOT from any client input
    expect(view.currency).toBe("ETB");
    expect(view.paymentMethod).toBe("bank_transfer");
    expect(view.paymentReference).toMatch(/^EEH-PAY-\d{8}-[A-Z2-9]{8}$/);
    expect(view.submittedAt).toBe(NOW.toISOString());
    expect(view.reviewedAt).toBeNull();

    const row = client.tables.get("payments")![0]!;
    expect(row.customer_id).toBe(CUSTOMER_A); // JWT-derived, never client-supplied
    expect(row.plan_id).toBe(starter.id);
  });

  it("answers NotFoundError for an unknown subscription", async () => {
    const { service, client } = makeService();

    await expect(
      service.submitPayment(CUSTOMER_A_USER, {
        subscriptionId: "cccccccc-cccc-4ccc-8ccc-999999999999",
        customerTransactionRef: "BANK-REF-1",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(client.tables.get("payments")).toHaveLength(0);
  });

  it("treats ANOTHER customer's subscription as nonexistent (isolation)", async () => {
    const starter = makePlan();
    const foreignSubscription = {
      id: "cccccccc-cccc-4ccc-8ccc-000000000002",
      customer_id: CUSTOMER_B, // belongs to B
      plan_id: starter.id,
      status: "pending",
      created_at: NOW.toISOString(),
      updated_at: NOW.toISOString(),
    };
    const { service, client } = makeService({
      plans: [starter],
      subscriptions: [foreignSubscription],
    });

    await expect(
      service.submitPayment(CUSTOMER_A_USER, {
        subscriptionId: foreignSubscription.id,
        customerTransactionRef: "BANK-REF-2",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(client.tables.get("payments")).toHaveLength(0);
  });

  it("refuses payment for an ACTIVE subscription", async () => {
    const starter = makePlan();
    const subscription = {
      id: "cccccccc-cccc-4ccc-8ccc-000000000003",
      customer_id: CUSTOMER_A,
      plan_id: starter.id,
      status: "active",
      created_at: NOW.toISOString(),
      updated_at: NOW.toISOString(),
    };
    const { service } = makeService({ plans: [starter], subscriptions: [subscription] });

    await expect(
      service.submitPayment(CUSTOMER_A_USER, {
        subscriptionId: subscription.id,
        customerTransactionRef: "BANK-REF-3",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("blocks a SECOND open payment for the same subscription", async () => {
    const starter = makePlan();
    const subscription = {
      id: "cccccccc-cccc-4ccc-8ccc-000000000004",
      customer_id: CUSTOMER_A,
      plan_id: starter.id,
      status: "pending",
      created_at: NOW.toISOString(),
      updated_at: NOW.toISOString(),
    };
    const existingPayment = {
      id: "dddddddd-dddd-4ddd-8ddd-000000000001",
      customer_id: CUSTOMER_A,
      subscription_id: subscription.id,
      plan_id: starter.id,
      amount: 499,
      currency: "ETB",
      payment_reference: "EEH-PAY-20260820-AAAAAAAA",
      customer_transaction_ref: "OLD-REF",
      payment_method: "bank_transfer",
      status: "under_review",
      submitted_at: NOW.toISOString(),
      reviewed_at: null,
      reviewed_by: null,
      rejection_reason: null,
      created_at: NOW.toISOString(),
      updated_at: NOW.toISOString(),
    };
    const { service } = makeService({
      plans: [starter],
      subscriptions: [subscription],
      payments: [existingPayment],
    });

    await expect(
      service.submitPayment(CUSTOMER_A_USER, {
        subscriptionId: subscription.id,
        customerTransactionRef: "NEW-REF",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects a REUSED bank transaction reference (same customer)", async () => {
    const starter = makePlan();
    const subscription = {
      id: "cccccccc-cccc-4ccc-8ccc-000000000005",
      customer_id: CUSTOMER_A,
      plan_id: starter.id,
      status: "pending",
      created_at: NOW.toISOString(),
      updated_at: NOW.toISOString(),
    };
    const oldPayment = {
      id: "dddddddd-dddd-4ddd-8ddd-000000000002",
      customer_id: CUSTOMER_A,
      subscription_id: "cccccccc-cccc-4ccc-8ccc-000000000099",
      plan_id: starter.id,
      amount: 499,
      currency: "ETB",
      payment_reference: "EEH-PAY-20260819-BBBBBBBB",
      customer_transaction_ref: "REUSED-REF",
      payment_method: "bank_transfer",
      status: "rejected",
      submitted_at: NOW.toISOString(),
      reviewed_at: NOW.toISOString(),
      reviewed_by: null,
      rejection_reason: "Wrong amount",
      created_at: NOW.toISOString(),
      updated_at: NOW.toISOString(),
    };
    const { service } = makeService({
      plans: [starter],
      subscriptions: [subscription],
      payments: [oldPayment],
    });

    await expect(
      service.submitPayment(CUSTOMER_A_USER, {
        subscriptionId: subscription.id,
        customerTransactionRef: "REUSED-REF",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("allows resubmission after a REJECTED payment", async () => {
    const starter = makePlan();
    const subscription = {
      id: "cccccccc-cccc-4ccc-8ccc-000000000006",
      customer_id: CUSTOMER_A,
      plan_id: starter.id,
      status: "pending",
      created_at: NOW.toISOString(),
      updated_at: NOW.toISOString(),
    };
    const rejectedPayment = {
      id: "dddddddd-dddd-4ddd-8ddd-000000000003",
      customer_id: CUSTOMER_A,
      subscription_id: subscription.id,
      plan_id: starter.id,
      amount: 499,
      currency: "ETB",
      payment_reference: "EEH-PAY-20260818-CCCCCCCC",
      customer_transaction_ref: "FIRST-REF",
      payment_method: "bank_transfer",
      status: "rejected",
      submitted_at: NOW.toISOString(),
      reviewed_at: NOW.toISOString(),
      reviewed_by: null,
      rejection_reason: "Unclear receipt",
      created_at: NOW.toISOString(),
      updated_at: NOW.toISOString(),
    };
    const { service, client } = makeService({
      plans: [starter],
      subscriptions: [subscription],
      payments: [rejectedPayment],
    });

    const view = await service.submitPayment(CUSTOMER_A_USER, {
      subscriptionId: subscription.id,
      customerTransactionRef: "SECOND-REF",
    });

    expect(view.status).toBe("pending");
    expect(client.tables.get("payments")).toHaveLength(2);
  });

  it("refuses an INACTIVE plan and a MISSING plan row distinctly", async () => {
    const retired = makePlan({ is_active: false });
    const retiredSub = {
      id: "cccccccc-cccc-4ccc-8ccc-000000000007",
      customer_id: CUSTOMER_A,
      plan_id: retired.id,
      status: "pending",
      created_at: NOW.toISOString(),
      updated_at: NOW.toISOString(),
    };
    const ghostSub = {
      id: "cccccccc-cccc-4ccc-8ccc-000000000008",
      customer_id: CUSTOMER_A,
      plan_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", // no such plan row
      status: "pending",
      created_at: NOW.toISOString(),
      updated_at: NOW.toISOString(),
    };
    const { service } = makeService({
      plans: [retired],
      subscriptions: [retiredSub, ghostSub],
    });

    await expect(
      service.submitPayment(CUSTOMER_A_USER, {
        subscriptionId: retiredSub.id,
        customerTransactionRef: "REF-A",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      service.submitPayment(CUSTOMER_A_USER, {
        subscriptionId: ghostSub.id,
        customerTransactionRef: "REF-B",
      }),
    ).rejects.toBeInstanceOf(DatabaseError);
  });
});

// ---------------------------------------------------------------------------
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** A minimal buffer that genuinely SNIFFS as PNG (header + IHDR-ish bytes). */
function pngBuffer(): Buffer {
  return Buffer.concat([PNG_HEADER, Buffer.alloc(16, 0x00)]);
}

function paymentRowFixture(status: string): Record<string, unknown> {
  return {
    id: "dddddddd-dddd-4ddd-8ddd-000000000010",
    customer_id: CUSTOMER_A,
    subscription_id: "cccccccc-cccc-4ccc-8ccc-000000000010",
    plan_id: "aaaaaaaa-aaaa-4aaa-8aaa-000000000010",
    amount: 499,
    currency: "ETB",
    payment_reference: "EEH-PAY-20260821-DDDDDDDD",
    customer_transaction_ref: "SLIP-REF-77",
    payment_method: "bank_transfer",
    status,
    submitted_at: NOW.toISOString(),
    reviewed_at: null,
    reviewed_by: null,
    rejection_reason: null,
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
  };
}

async function makeServiceWithPayment(status: string) {
  const payment = paymentRowFixture(status);
  const handle = makeService({ payments: [payment] });
  return { ...handle, payment };
}

describe("PaymentServiceImpl.uploadReceipt", () => {
  it("stores bytes at a SERVER-generated private path and records metadata", async () => {
    const { service, client, storage } = await makeServiceWithPayment("pending");

    const result = await service.uploadReceipt(
      CUSTOMER_A_USER,
      paymentRowFixture("pending").id as string,
      {
        mimeType: "image/png",
        originalName: "..\\..\\evil\\slip.png",
        buffer: pngBuffer(),
      },
    );

    const paths = [...storage.objects.keys()];
    expect(paths).toHaveLength(1);
    // Path contains customer + payment scoping and NO user-controlled segments.
    expect(paths[0]).toMatch(new RegExp(`^receipts/${CUSTOMER_A}/[0-9a-f-]+/[0-9a-f-]+\\.png$`));
    expect(result.mimeType).toBe("image/png");
    expect(result.originalFilename).toBe("slip.png"); // basename only

    const row = client.tables.get("payment_receipts")![0]!;
    expect(row.storage_path).toBe(paths[0]);
    expect(row.mime_type).toBe("image/png");
  });

  it("answers 404 for ANOTHER customer's payment (no leak)", async () => {
    const { service } = await makeServiceWithPayment("pending");

    await expect(
      service.uploadReceipt(CUSTOMER_B_USER, paymentRowFixture("pending").id as string, {
        mimeType: "image/png",
        originalName: "slip.png",
        buffer: pngBuffer(),
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses receipts for APPROVED/REJECTED/CANCELLED payments", async () => {
    for (const status of ["approved", "rejected", "cancelled"]) {
      const { service } = await makeServiceWithPayment(status);
      await expect(
        service.uploadReceipt(CUSTOMER_A_USER, paymentRowFixture(status).id as string, {
          mimeType: "image/png",
          originalName: "slip.png",
          buffer: pngBuffer(),
        }),
      ).rejects.toBeInstanceOf(ConflictError);
    }
  });

  it("allows only ONE receipt per payment", async () => {
    const paymentId = paymentRowFixture("pending").id as string;
    const { service, storage } = await makeServiceWithPayment("pending");
    const file = { mimeType: "image/png", originalName: "slip.png", buffer: pngBuffer() };

    await service.uploadReceipt(CUSTOMER_A_USER, paymentId, file);
    await expect(service.uploadReceipt(CUSTOMER_A_USER, paymentId, file)).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(storage.objects.size).toBe(1);
  });

  it("rejects content that does not MATCH its declared type", async () => {
    const { service } = await makeServiceWithPayment("pending");

    // Declared PNG, actually plain text/script.
    await expect(
      service.uploadReceipt(CUSTOMER_A_USER, paymentRowFixture("pending").id as string, {
        mimeType: "image/png",
        originalName: "payload.png",
        buffer: Buffer.from("#!/bin/sh\nrm -rf /"),
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects files over 5 MB", async () => {
    const { service } = await makeServiceWithPayment("pending");

    await expect(
      service.uploadReceipt(CUSTOMER_A_USER, paymentRowFixture("pending").id as string, {
        mimeType: "application/pdf",
        originalName: "big.pdf",
        buffer: Buffer.concat([Buffer.from("%PDF-1.7"), Buffer.alloc(5 * 1024 * 1024 + 1, 0x41)]),
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("never logs references, amounts, or storage paths", async () => {
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => undefined);
    const paymentId = paymentRowFixture("pending").id as string;
    const { service } = await makeServiceWithPayment("pending");

    await service.uploadReceipt(CUSTOMER_A_USER, paymentId, {
      mimeType: "image/png",
      originalName: "slip.png",
      buffer: pngBuffer(),
    });

    const logged = JSON.stringify(infoSpy.mock.calls);
    expect(logged).not.toContain("receipts/");
    expect(logged).not.toContain("SLIP-REF-77");
    expect(logged).toContain(paymentId); // referenced by id only
  });
});
