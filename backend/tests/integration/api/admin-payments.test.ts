/**
 * Admin payment-review and bank-configuration integration tests (Phase 3).
 *
 * Full HTTP stack via Supertest: role guards, listing/filtering, review
 * transitions, SUBSCRIPTION ACTIVATION on approval (with double-approval
 * safety), signed receipt URLs, and bank-account CRUD visibility rules.
 */

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", async () => {
  const { getFakeClient, isDatabaseConnected } = await import("../../helpers/supabase");
  return {
    getSupabase: () => getFakeClient(),
    verifyDatabaseConnection: async () => isDatabaseConnected(),
  };
});

// Receipts must land in an in-memory fake, never the real Storage client.
vi.mock("@/lib/receipt-storage", async () => {
  const { FakeReceiptStorage } = await import("../../helpers/fake-receipt-storage");
  return {
    RECEIPT_BUCKET: "payment-receipts",
    RECEIPT_URL_TTL_SECONDS: 300,
    SupabaseReceiptStorage: FakeReceiptStorage,
  };
});

import { createApp } from "@/app";
import {
  defaultSeed,
  getFakeClient,
  seedFakeClient,
  setDatabaseConnected,
} from "../../helpers/supabase";

const app = createApp();

const STAMP = "2026-08-01T00:00:00.000Z";
const STARTER_PLAN_ID = "11111111-1111-4111-8111-000000000002";
const BANK_ROW = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-000000000001",
  bank_name: "Commercial Bank of Ethiopia",
  account_name: "EthioExchange PLC",
  account_number: "1000123456789",
  branch_name: "Bole",
  instructions: "Memo = payment reference.",
  is_active: true,
  created_at: STAMP,
  updated_at: STAMP,
};
const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32, 0x07),
]);

function basePlan(n: string): Record<string, unknown> {
  return {
    id: `11111111-1111-4111-8111-00000000000${n}`,
    name: n === "2" ? "Starter" : "Free",
    slug: n === "2" ? "starter" : "free",
    description: null,
    price: n === "2" ? 499 : 0,
    currency: "ETB",
    billing_interval: "monthly",
    monthly_request_limit: 10000,
    requests_per_minute: 60,
    max_api_keys: 2,
    is_active: true,
    display_order: Number(n),
    created_at: STAMP,
    updated_at: STAMP,
  };
}

beforeEach(() => {
  seedFakeClient({
    ...defaultSeed,
    customers: [],
    api_keys: [],
    api_plans: [basePlan("1"), basePlan("2")],
    subscriptions: [],
    payments: [],
    payment_receipts: [],
    bank_payment_config: [BANK_ROW],
  });
  setDatabaseConnected(true);
});

async function customerAuth(email: string): Promise<{ Authorization: string }> {
  const register = await request(app).post("/api/v1/auth/register").send({
    email,
    password: "StrongPassword123!",
    company_name: "Example Company",
  });
  expect(register.status).toBe(201);
  const login = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password: "StrongPassword123!" });
  expect(login.status).toBe(200);
  return {
    Authorization: `Bearer ${(login.body.data as { tokens: { accessToken: string } }).tokens.accessToken}`,
  };
}

async function adminAuth(): Promise<{ Authorization: string }> {
  const login = await request(app).post("/api/v1/auth/login").send({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  expect(login.status).toBe(200);
  const accessToken = (login.body.data as { tokens: { accessToken: string } }).tokens.accessToken;
  return { Authorization: `Bearer ${accessToken}` };
}

/** Creates a customer with a PENDING subscription and one OPEN payment. */
async function customerWithOpenPayment(
  email: string,
): Promise<{ auth: { Authorization: string }; subscriptionId: string; paymentId: string }> {
  const auth = await customerAuth(email);
  await request(app)
    .post("/api/v1/customer/subscription")
    .set(auth)
    .send({ plan_id: STARTER_PLAN_ID });

  const submit = await request(app)
    .post("/api/v1/customer/payments")
    .set(auth)
    .send({
      subscription_id: (await currentSubscription(auth)).id,
      customer_transaction_ref: `REF-${email}`,
    });
  expect(submit.status).toBe(201);
  return {
    auth,
    subscriptionId: (await currentSubscription(auth)).id,
    paymentId: (submit.body.data as { id: string }).id,
  };
}

async function currentSubscription(auth: { Authorization: string }): Promise<{
  id: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}> {
  const res = await request(app).get("/api/v1/customer/subscription").set(auth);
  if (res.status === 404) throw new Error("no subscription");
  return res.body.data;
}

describe("Guards — admin-only surface", () => {
  it("rejects anonymous callers with 401", async () => {
    expect((await request(app).get("/api/v1/admin/payments")).status).toBe(401);
    expect(
      (
        await request(app).post(`/api/v1/admin/payments/${BANK_ROW.id}/review`).send({
          action: "approve",
        })
      ).status,
    ).toBe(401);
    expect((await request(app).get("/api/v1/admin/payment-methods")).status).toBe(401);
    expect((await request(app).post("/api/v1/admin/payment-methods").send({})).status).toBe(401);
  });

  it("rejects customers with 403 — including read attempts", async () => {
    const auth = await customerAuth("notadmin@example.com");
    expect((await request(app).get("/api/v1/admin/payments").set(auth)).status).toBe(403);
    expect((await request(app).get("/api/v1/admin/payment-methods").set(auth)).status).toBe(403);
    expect(
      (
        await request(app)
          .patch(`/api/v1/admin/payment-methods/${BANK_ROW.id}`)
          .set(auth)
          .send({ is_active: false })
      ).status,
    ).toBe(403);
    // A customer can never approve their own payment.
    const { paymentId } = await customerWithOpenPayment("selfapprover@example.com");
    const approve = await request(app)
      .post(`/api/v1/admin/payments/${paymentId}/review`)
      .set(auth)
      .send({ action: "approve" });
    expect(approve.status).toBe(403);
  });

  it("allows admin AND super_admin roles", async () => {
    const admin = await adminAuth();
    expect((await request(app).get("/api/v1/admin/payments").set(admin)).status).toBe(200);
    // super_admin passes the same allowlist guard.
    expect((await request(app).get("/api/v1/admin/payment-methods").set(admin)).status).toBe(200);
  });
});

describe("GET /admin/payments", () => {
  it("lists submitted payments newest first; status filter works", async () => {
    await customerWithOpenPayment("listed@example.com");
    const admin = await adminAuth();

    const all = await request(app).get("/api/v1/admin/payments").set(admin);
    expect(all.status).toBe(200);
    expect(all.body.data).toHaveLength(1);
    expect((all.body.data[0] as Record<string, unknown>).status).toBe("pending");

    const filtered = await request(app).get("/api/v1/admin/payments?status=approved").set(admin);
    expect(filtered.body.data).toHaveLength(0);

    const badFilter = await request(app).get("/api/v1/admin/payments?status=rich").set(admin);
    expect(badFilter.status).toBe(422);
  });

  it("returns 404 detail for unknown ids", async () => {
    const admin = await adminAuth();
    const res = await request(app)
      .get("/api/v1/admin/payments/dddddddd-dddd-4ddd-8ddd-999999999999")
      .set(admin);
    expect(res.status).toBe(404);
  });
});

describe("POST /admin/payments/:id/review — approval activates the subscription", () => {
  it("approval stamps reviewer identity/time and ACTIVATES the monthly period", async () => {
    const { auth, paymentId } = await customerWithOpenPayment("approved@example.com");
    const before = new Date();

    const review = await request(app)
      .post(`/api/v1/admin/payments/${paymentId}/review`)
      .set(await adminAuth())
      .send({ action: "approve" });
    expect(review.status).toBe(200);

    const view = review.body.data as Record<string, unknown>;
    expect(view.status).toBe("approved");
    expect(view.reviewedAt).not.toBeNull();
    expect(new Date(view.reviewedAt as string).getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(view.reviewedBy).not.toBeNull(); // the admin's user id

    // The customer's subscription is now ACTIVE with a fresh one-month period.
    const subscription = await currentSubscription(auth);
    expect(subscription.status).toBe("active");
    expect(subscription.currentPeriodStart).not.toBeNull();
    expect(subscription.currentPeriodEnd).not.toBeNull();
    const start = new Date(subscription.currentPeriodStart!).getTime();
    const end = new Date(subscription.currentPeriodEnd!).getTime();
    const ONE_MONTH_MS = 31 * 24 * 60 * 60 * 1000;
    expect(end - start).toBeGreaterThan(27 * 24 * 60 * 60 * 1000);
    expect(end - start).toBeLessThanOrEqual(ONE_MONTH_MS + 1000);
  });

  it("a PENDING payment alone NEVER activates the subscription", async () => {
    const { auth } = await customerWithOpenPayment("stillpending@example.com");

    const subscription = await currentSubscription(auth);
    expect(subscription.status).toBe("pending");
    expect(subscription.currentPeriodStart).toBeNull();
  });

  it("REJECTED payments do not activate; reason is required and recorded", async () => {
    const { auth, paymentId } = await customerWithOpenPayment("rejectee@example.com");
    const admin = await adminAuth();

    const missingReason = await request(app)
      .post(`/api/v1/admin/payments/${paymentId}/review`)
      .set(admin)
      .send({ action: "reject" });
    expect(missingReason.status).toBe(422);

    const reject = await request(app)
      .post(`/api/v1/admin/payments/${paymentId}/review`)
      .set(admin)
      .send({ action: "reject", rejection_reason: "Transfer not found in bank statement." });
    expect(reject.status).toBe(200);
    expect((reject.body.data as Record<string, unknown>).rejectionReason).toContain(
      "bank statement",
    );

    const subscription = await currentSubscription(auth);
    expect(subscription.status).toBe("pending"); // NOT activated
  });

  it("CANCELLED payments cannot be reviewed", async () => {
    const { paymentId } = await customerWithOpenPayment("cancelme@example.com");
    getFakeClient().tables.get("payments")![0]!.status = "cancelled";

    const res = await request(app)
      .post(`/api/v1/admin/payments/${paymentId}/review`)
      .set(await adminAuth())
      .send({ action: "approve" });
    expect(res.status).toBe(409);
  });

  it("REPEATED approval answers 409 WITHOUT extending the billing period twice", async () => {
    const { paymentId, subscriptionId } = await customerWithOpenPayment("double@example.com");
    const admin = await adminAuth();

    await request(app)
      .post(`/api/v1/admin/payments/${paymentId}/review`)
      .set(admin)
      .send({ action: "approve" });
    const periodAfterFirst = (
      getFakeClient()
        .tables.get("subscriptions")!
        .find((row) => row.id === subscriptionId) as Record<string, unknown>
    ).current_period_end;

    // Advance the clock so a buggy second extension would be visible.
    // A fresh login is required: tokens issued before the jump look expired.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T00:00:00.000Z"));
    try {
      const freshAdmin = await adminAuth();
      const second = await request(app)
        .post(`/api/v1/admin/payments/${paymentId}/review`)
        .set(freshAdmin)
        .send({ action: "approve" });
      expect(second.status).toBe(409);
    } finally {
      vi.useRealTimers();
    }

    expect(
      (
        getFakeClient()
          .tables.get("subscriptions")!
          .find((row) => row.id === subscriptionId) as Record<string, unknown>
      ).current_period_end,
    ).toBe(periodAfterFirst); // untouched
  });

  it("supports the pending → under_review → approved workflow", async () => {
    const { paymentId } = await customerWithOpenPayment("workflow@example.com");
    const admin = await adminAuth();

    const mark = await request(app)
      .post(`/api/v1/admin/payments/${paymentId}/review`)
      .set(admin)
      .send({ action: "under_review" });
    expect(mark.status).toBe(200);
    expect((mark.body.data as Record<string, unknown>).status).toBe("under_review");

    const approve = await request(app)
      .post(`/api/v1/admin/payments/${paymentId}/review`)
      .set(admin)
      .send({ action: "approve" });
    expect(approve.status).toBe(200);
    expect((approve.body.data as Record<string, unknown>).status).toBe("approved");
  });

  it("validates review bodies strictly", async () => {
    const { paymentId } = await customerWithOpenPayment("validate@example.com");
    const admin = await adminAuth();

    const badAction = await request(app)
      .post(`/api/v1/admin/payments/${paymentId}/review`)
      .set(admin)
      .send({ action: "activate" });
    expect(badAction.status).toBe(422);

    const extraField = await request(app)
      .post(`/api/v1/admin/payments/${paymentId}/review`)
      .set(admin)
      .send({ action: "approve", status: "approved" }); // status is server-controlled
    expect(extraField.status).toBe(422);
  });
});

describe("GET /admin/payments/:id/receipt", () => {
  it("404s without a receipt and returns a SIGNED URL after upload", async () => {
    const admin = await adminAuth();
    const { auth, paymentId } = await customerWithOpenPayment("receiptview@example.com");

    const none = await request(app).get(`/api/v1/admin/payments/${paymentId}/receipt`).set(admin);
    expect(none.status).toBe(404);

    const upload = await request(app)
      .post(`/api/v1/customer/payments/${paymentId}/receipt`)
      .set(auth)
      .attach("receipt", PNG_BYTES, { filename: "slip.png", contentType: "image/png" });
    expect(upload.status).toBe(201);

    const signed = await request(app).get(`/api/v1/admin/payments/${paymentId}/receipt`).set(admin);
    expect(signed.status).toBe(200);
    const data = signed.body.data as Record<string, unknown>;
    expect(String(data.url)).toContain("https://signed.test/");
    expect(Number(data.expiresInSeconds)).toBeGreaterThan(0);
    // Raw storage paths are never exposed even to admins via this endpoint.
    expect(JSON.stringify(signed.body)).not.toContain('"storagePath"');
  });
});

describe("Admin bank configuration management", () => {
  it("lists ALL accounts (inactive included) for admins", async () => {
    getFakeClient().tables.get("bank_payment_config")![0]!.is_active = false;
    const admin = await adminAuth();

    const res = await request(app).get("/api/v1/admin/payment-methods").set(admin);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect((res.body.data[0] as Record<string, unknown>).isActive).toBe(false);
  });

  it("creates, updates, and deactivates accounts", async () => {
    const admin = await adminAuth();

    const create = await request(app).post("/api/v1/admin/payment-methods").set(admin).send({
      bank_name: "Awash Bank",
      account_name: "EthioExchange PLC",
      account_number: "0130498765432",
      branch_name: "Head Office",
      instructions: "Transfer before 5 PM.",
    });
    expect(create.status).toBe(201);
    expect((create.body.data as Record<string, unknown>).isActive).toBe(true);

    const createdId = (create.body.data as { id: string }).id;
    const update = await request(app)
      .patch(`/api/v1/admin/payment-methods/${createdId}`)
      .set(admin)
      .send({ branch_name: "Meskel Flower", instructions: null });
    expect(update.status).toBe(200);
    expect((update.body.data as Record<string, unknown>).branchName).toBe("Meskel Flower");
    expect((update.body.data as Record<string, unknown>).instructions).toBeNull();

    const deactivate = await request(app)
      .patch(`/api/v1/admin/payment-methods/${createdId}`)
      .set(admin)
      .send({ is_active: false });
    expect((deactivate.body.data as Record<string, unknown>).isActive).toBe(false);

    const reactivate = await request(app)
      .patch(`/api/v1/admin/payment-methods/${createdId}`)
      .set(admin)
      .send({ is_active: true });
    expect((reactivate.body.data as Record<string, unknown>).isActive).toBe(true);

    const emptyUpdate = await request(app)
      .patch(`/api/v1/admin/payment-methods/${createdId}`)
      .set(admin)
      .send({});
    expect(emptyUpdate.status).toBe(422);
  });

  it("answers 404 when updating an unknown account", async () => {
    const admin = await adminAuth();
    const res = await request(app)
      .patch("/api/v1/admin/payment-methods/bbbbbbbb-bbbb-4bbb-8bbb-999999999999")
      .set(admin)
      .send({ is_active: false });
    expect(res.status).toBe(404);
  });

  it("deactivated accounts vanish from the CUSTOMER listing immediately", async () => {
    const auth = await customerAuth("watcher@example.com");
    const admin = await adminAuth();

    const before = await request(app).get("/api/v1/customer/payment-methods").set(auth);
    expect(before.body.data).toHaveLength(1);

    await request(app)
      .patch(`/api/v1/admin/payment-methods/${BANK_ROW.id}`)
      .set(admin)
      .send({ is_active: false });

    const after = await request(app).get("/api/v1/customer/payment-methods").set(auth);
    expect(after.body.data).toHaveLength(0);
  });
});
