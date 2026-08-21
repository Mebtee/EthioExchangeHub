import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConflictError, DatabaseError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { ReceiptStorage } from "@/lib/receipt-storage";
import { BankPaymentConfigRepository } from "@/repositories/BankPaymentConfigRepository";
import { PaymentReceiptsRepository } from "@/repositories/PaymentReceiptsRepository";
import { PaymentsRepository } from "@/repositories/PaymentsRepository";
import { SubscriptionsRepository } from "@/repositories/SubscriptionsRepository";
import { AdminPaymentServiceImpl } from "@/services/AdminPaymentService";
import type { Database, PaymentRow } from "@/types/database";
import { addOneMonthIso, nowIso } from "@/utils/date";

import { createFakeSupabaseClient } from "../../helpers/supabase-client";

// ---- Deterministic clock -----------------------------------------------------
const NOW = new Date("2026-08-21T12:00:00.000Z");
const NOW_ISO = NOW.toISOString();
const ADMIN_USER = "77777777-7777-4777-8777-777777777777";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.spyOn(logger, "info").mockImplementation(() => undefined);
});

const CUSTOMER_A = "11111111-1111-4111-8111-111111111111";
const SUBSCRIPTION_ID = "cccccccc-cccc-4ccc-8ccc-000000000001";
const PLAN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-000000000001";
const PAYMENT_ID = "dddddddd-dddd-4ddd-8ddd-000000000001";

function makeSubscription(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: SUBSCRIPTION_ID,
    customer_id: CUSTOMER_A,
    plan_id: PLAN_ID,
    status: "pending",
    starts_at: null,
    ends_at: null,
    current_period_start: null,
    current_period_end: null,
    cancelled_at: null,
    cancellation_reason: null,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    ...overrides,
  };
}

function makePayment(status: string): PaymentRow {
  return {
    id: PAYMENT_ID,
    customer_id: CUSTOMER_A,
    subscription_id: SUBSCRIPTION_ID,
    plan_id: PLAN_ID,
    amount: 499,
    currency: "ETB",
    payment_reference: "EEH-PAY-20260821-AAAA2222",
    customer_transaction_ref: "BANK-SLIP-42",
    payment_method: "bank_transfer",
    status,
    submitted_at: NOW_ISO,
    reviewed_at: null,
    reviewed_by: null,
    rejection_reason: null,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  };
}

class FakeReceiptStorage implements ReceiptStorage {
  readonly objects = new Map<string, Buffer>();
  async upload(path: string, content: Buffer): Promise<void> {
    this.objects.set(path, content);
  }
  async signedUrl(path: string): Promise<string> {
    return `https://signed.test/${path}`;
  }
}

interface SeedOptions {
  payments?: PaymentRow[];
  subscriptions?: Record<string, unknown>[];
  receipts?: Record<string, unknown>[];
}

function makeService(seed: SeedOptions = {}) {
  const client = createFakeSupabaseClient({
    users: [],
    customers: [],
    api_plans: [],
    subscriptions: seed.subscriptions ?? [makeSubscription()],
    payments: seed.payments ?? [makePayment("pending")],
    payment_receipts: seed.receipts ?? [],
    bank_payment_config: [],
  });
  const supabase = client as unknown as SupabaseClient<Database>;
  const storage = new FakeReceiptStorage();
  const service = new AdminPaymentServiceImpl(
    new PaymentsRepository(supabase),
    new PaymentReceiptsRepository(supabase),
    new SubscriptionsRepository(supabase),
    new BankPaymentConfigRepository(supabase),
    storage,
  );
  return { service, client, storage };
}

describe("AdminPaymentServiceImpl.listPayments / getPayment", () => {
  it("lists payments newest first and filters by status", async () => {
    const newer = { ...makePayment("under_review"), id: PAYMENT_ID, created_at: NOW_ISO };
    const older = makePaymentWithCreated(makePayment("approved"), "2026-08-20T00:00:00.000Z");
    const { service } = makeService({ payments: [newer, older] });

    const all = await service.listPayments();
    expect(all.map((payment) => payment.id)).toEqual([PAYMENT_ID, older.id]);
    expect(all[0]!.reviewedBy).toBeNull(); // admins see reviewer identity fields

    const approvedOnly = await service.listPayments("approved");
    expect(approvedOnly.map((payment) => payment.id)).toEqual([older.id]);
  });

  it("answers NotFoundError for an unknown payment", async () => {
    const { service } = makeService({ payments: [] });
    await expect(service.getPayment(PAYMENT_ID)).rejects.toBeInstanceOf(NotFoundError);
  });
});

function makePaymentWithCreated(base: PaymentRow, createdAt: string): PaymentRow {
  return { ...base, id: "dddddddd-dddd-4ddd-8ddd-000000000002", created_at: createdAt };
}

describe("AdminPaymentServiceImpl.reviewPayment", () => {
  it("APPROVAL activates the subscription with a one-month period starting now", async () => {
    const { service, client } = makeService();

    const view = await service.reviewPayment(PAYMENT_ID, ADMIN_USER, { action: "approve" });

    expect(view.status).toBe("approved");
    expect(view.reviewedBy).toBe(ADMIN_USER);
    expect(view.reviewedAt).toBe(NOW_ISO);

    const subscription = client.tables.get("subscriptions")![0]!;
    expect(subscription.status).toBe("active");
    expect(subscription.starts_at).toBe(NOW_ISO);
    expect(subscription.current_period_start).toBe(NOW_ISO);
    expect(subscription.current_period_end).toBe(addOneMonthIso(NOW_ISO));
  });

  it("REPEATED approval answers 409 WITHOUT extending the billing period", async () => {
    const { service, client } = makeService();
    await service.reviewPayment(PAYMENT_ID, ADMIN_USER, { action: "approve" });
    const periodAfterFirst = client.tables.get("subscriptions")![0]!.current_period_end;

    await expect(
      service.reviewPayment(PAYMENT_ID, ADMIN_USER, { action: "approve" }),
    ).rejects.toBeInstanceOf(ConflictError);

    // Nothing moved — same period end, same updated_at.
    expect(client.tables.get("subscriptions")![0]!.current_period_end).toBe(periodAfterFirst);
  });

  it("REJECTION records the reason and NEVER activates the subscription", async () => {
    const { service, client } = makeService();

    const view = await service.reviewPayment(PAYMENT_ID, ADMIN_USER, {
      action: "reject",
      rejectionReason: "Amount does not match the plan price.",
    });

    expect(view.status).toBe("rejected");
    expect(view.rejectionReason).toBe("Amount does not match the plan price.");
    expect(client.tables.get("subscriptions")![0]!.status).toBe("pending"); // untouched
  });

  it("moves PENDING payments under review; terminal states never move again", async () => {
    const underReviewSeed = makePayment("under_review");
    const rejectedSeed = makePayment("rejected");
    rejectedSeed.id = "dddddddd-dddd-4ddd-8ddd-000000000002";
    const cancelledSeed = makePayment("cancelled");
    cancelledSeed.id = "dddddddd-dddd-4ddd-8ddd-000000000003";
    const { service } = makeService({
      payments: [underReviewSeed, rejectedSeed, cancelledSeed],
    });

    const moved = await service.reviewPayment(PAYMENT_ID, ADMIN_USER, { action: "approve" });
    expect(moved.status).toBe("approved");

    for (const id of [rejectedSeed.id, cancelledSeed.id]) {
      await expect(
        service.reviewPayment(id, ADMIN_USER, { action: "approve" }),
      ).rejects.toBeInstanceOf(ConflictError);
      await expect(
        service.reviewPayment(id, ADMIN_USER, { action: "under_review" }),
      ).rejects.toBeInstanceOf(ConflictError);
    }
  });

  it("allows approval from UNDER_REVIEW as well as pending", async () => {
    const { service, client } = makeService({ payments: [makePayment("under_review")] });

    const view = await service.reviewPayment(PAYMENT_ID, ADMIN_USER, { action: "approve" });
    expect(view.status).toBe("approved");
    expect(client.tables.get("subscriptions")![0]!.status).toBe("active");
  });

  it("refuses under_review for non-pending payments", async () => {
    const { service } = makeService({ payments: [makePayment("under_review")] });

    await expect(
      service.reviewPayment(PAYMENT_ID, ADMIN_USER, { action: "under_review" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("answers DatabaseError when an approved payment has NO subscription link", async () => {
    const orphan = makePayment("pending");
    orphan.subscription_id = null;
    const { service } = makeService({ payments: [orphan] });

    await expect(
      service.reviewPayment(PAYMENT_ID, ADMIN_USER, { action: "approve" }),
    ).rejects.toBeInstanceOf(DatabaseError);
  });
});

describe("AdminPaymentServiceImpl.getReceiptUrl", () => {
  it("404s when no receipt exists; signs a SHORT-LIVED URL when it does", async () => {
    const { service } = makeService();

    await expect(service.getReceiptUrl(PAYMENT_ID)).rejects.toBeInstanceOf(NotFoundError);

    // Attach a receipt directly to the fake table.
    const handle = makeService({
      receipts: [
        {
          id: "eeeeeeee-eeee-4eee-8eee-000000000001",
          payment_id: PAYMENT_ID,
          storage_path: "receipts/x/y.png",
          original_filename: "slip.png",
          mime_type: "image/png",
          uploaded_at: NOW_ISO,
        },
      ],
    });
    const receipt = await handle.service.getReceiptUrl(PAYMENT_ID);
    expect(receipt.url).toContain("https://signed.test/receipts/x/y.png");
    expect(receipt.expiresInSeconds).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
const BANK_ROW = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-000000000001",
  bank_name: "Commercial Bank of Ethiopia",
  account_name: "EthioExchange PLC",
  account_number: "1000123456789",
  branch_name: "Bole",
  instructions: "Memo = payment reference.",
  is_active: true,
  created_at: NOW_ISO,
  updated_at: NOW_ISO,
};

describe("AdminPaymentServiceImpl bank configuration", () => {
  function makeBankService() {
    const client = createFakeSupabaseClient({
      users: [],
      customers: [],
      api_plans: [],
      subscriptions: [],
      payments: [],
      payment_receipts: [],
      bank_payment_config: [BANK_ROW],
    });
    const service = new AdminPaymentServiceImpl(
      new PaymentsRepository(client as unknown as SupabaseClient<Database>),
      new PaymentReceiptsRepository(client as unknown as SupabaseClient<Database>),
      new SubscriptionsRepository(client as unknown as SupabaseClient<Database>),
      new BankPaymentConfigRepository(client as unknown as SupabaseClient<Database>),
      new FakeReceiptStorage(),
    );
    return { service, client };
  }

  it("creates a bank account ACTIVE by default with server timestamps", async () => {
    const { service, client } = makeBankService();

    const view = await service.createBankAccount({
      bankName: "Awash Bank",
      accountName: "EthioExchange PLC",
      accountNumber: "0130498765432",
    });

    expect(view.isActive).toBe(true);
    const row = client.tables.get("bank_payment_config")![1]!;
    expect(row.created_at).toBe(nowIso());
  });

  it("updates fields and DEACTIVATES via is_active", async () => {
    const { service, client } = makeBankService();

    const deactivated = await service.updateBankAccount(BANK_ROW.id, {
      isActive: false,
      instructions: "Temporarily unavailable.",
    });
    expect(deactivated.isActive).toBe(false);
    expect(deactivated.instructions).toBe("Temporarily unavailable.");

    const reactivated = await service.updateBankAccount(BANK_ROW.id, { isActive: true });
    expect(reactivated.isActive).toBe(true);

    expect(client.tables.get("bank_payment_config")).toHaveLength(1); // update, not insert
  });

  it("answers NotFoundError for an unknown bank account id", async () => {
    const { service } = makeBankService();
    await expect(
      service.updateBankAccount("bbbbbbbb-bbbb-4bbb-8bbb-999999999999", { isActive: false }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
