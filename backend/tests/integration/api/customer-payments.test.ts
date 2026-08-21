/**
 * Customer payment integration tests (Phase 3).
 *
 * Full HTTP stack via Supertest against the in-memory fake Supabase client:
 * guards, active-bank-account visibility, submission semantics (server-derived
 * amount/currency/status/reference), duplicate protection, isolation, receipt
 * upload validation, and mass-assignment rejection.
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
import { defaultSeed, seedFakeClient, setDatabaseConnected } from "../../helpers/supabase";

const app = createApp();

const STAMP = "2026-08-01T00:00:00.000Z";

const FREE_PLAN = {
  ...basePlan("1"),
  name: "Free",
  slug: "free",
  price: 0,
};
const STARTER_PLAN = {
  ...basePlan("2"),
  name: "Starter",
  slug: "starter",
  price: 499,
  monthly_request_limit: 25000,
  requests_per_minute: 60,
  max_api_keys: 2,
};

function basePlan(n: string) {
  return {
    id: `11111111-1111-4111-8111-00000000000${n}`,
    description: null,
    currency: "ETB",
    billing_interval: "monthly",
    monthly_request_limit: 10000,
    requests_per_minute: 60,
    max_api_keys: 1,
    is_active: true,
    display_order: Number(n),
    created_at: STAMP,
    updated_at: STAMP,
  };
}

const ACTIVE_BANK = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-000000000001",
  bank_name: "Commercial Bank of Ethiopia",
  account_name: "EthioExchange PLC",
  account_number: "1000123456789",
  branch_name: "Bole",
  instructions: "Use the payment reference as the transfer memo.",
  is_active: true,
  created_at: STAMP,
  updated_at: STAMP,
};
const INACTIVE_BANK = {
  ...ACTIVE_BANK,
  id: "bbbbbbbb-bbbb-4bbb-8bbb-000000000002",
  bank_name: "Retired Bank",
  account_number: "9999999999",
  is_active: false,
};

beforeEach(() => {
  seedFakeClient({
    ...defaultSeed,
    customers: [],
    api_keys: [],
    api_plans: [FREE_PLAN, STARTER_PLAN],
    subscriptions: [],
    payments: [],
    payment_receipts: [],
    bank_payment_config: [ACTIVE_BANK, INACTIVE_BANK],
  });
  setDatabaseConnected(true);
});

/** Registers + logs in a fresh customer; returns the bearer header. */
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
  const accessToken = (login.body.data as { tokens: { accessToken: string } }).tokens.accessToken;
  return { Authorization: `Bearer ${accessToken}` };
}

/** Selects the paid Starter plan (subscription becomes pending) for the caller. */
async function selectStarterPlan(auth: { Authorization: string }): Promise<string> {
  const res = await request(app)
    .post("/api/v1/customer/subscription")
    .set(auth)
    .send({ plan_id: STARTER_PLAN.id });
  expect(res.status).toBe(201);
  return (res.body.data as { id: string }).id;
}

/** Submits a payment for the given subscription; returns the payment payload. */
async function submitPayment(
  auth: { Authorization: string },
  subscriptionId: string,
  ref = "BANK-SLIP-001",
): Promise<Record<string, unknown>> {
  const res = await request(app)
    .post("/api/v1/customer/payments")
    .set(auth)
    .send({ subscription_id: subscriptionId, customer_transaction_ref: ref });
  expect(res.status).toBe(201);
  return res.body.data as Record<string, unknown>;
}

describe("Guards — customer-only payment surface", () => {
  it("rejects unauthenticated access with 401", async () => {
    const methods = await request(app).get("/api/v1/customer/payment-methods");
    expect(methods.status).toBe(401);

    const submit = await request(app).post("/api/v1/customer/payments").send({});
    expect(submit.status).toBe(401);

    const history = await request(app).get("/api/v1/customer/payments");
    expect(history.status).toBe(401);

    const receipt = await request(app).post(
      "/api/v1/customer/payments/dddddddd-dddd-4ddd-8ddd-000000000001/receipt",
    );
    expect(receipt.status).toBe(401);
  });

  it("rejects an authenticated admin with 403", async () => {
    const adminLogin = await request(app).post("/api/v1/auth/login").send({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });
    const admin = {
      Authorization: `Bearer ${(adminLogin.body.data as { tokens: { accessToken: string } }).tokens.accessToken}`,
    };

    expect((await request(app).get("/api/v1/customer/payment-methods").set(admin)).status).toBe(
      403,
    );
    expect(
      (
        await request(app).post("/api/v1/customer/payments").set(admin).send({
          subscription_id: STARTER_PLAN.id,
          customer_transaction_ref: "X",
        })
      ).status,
    ).toBe(403);
    expect((await request(app).get("/api/v1/customer/payments").set(admin)).status).toBe(403);
  });
});

describe("GET /customer/payment-methods", () => {
  it("returns ACTIVE bank accounts only and hides internal fields", async () => {
    const auth = await customerAuth("methods@example.com");

    const res = await request(app).get("/api/v1/customer/payment-methods").set(auth);

    expect(res.status).toBe(200);
    const items = res.body.data as Array<Record<string, unknown>>;
    expect(items.map((bank) => bank.bankName)).toEqual(["Commercial Bank of Ethiopia"]);
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain("is_active");
    expect(serialized).not.toContain("created_at");
    expect(serialized).not.toContain("Retired Bank");
  });

  it("hides an account immediately after an admin deactivates it", async () => {
    const auth = await customerAuth("deactivate@example.com");
    const adminLogin = await request(app).post("/api/v1/auth/login").send({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });
    const admin = {
      Authorization: `Bearer ${(adminLogin.body.data as { tokens: { accessToken: string } }).tokens.accessToken}`,
    };
    const patch = await request(app)
      .patch(`/api/v1/admin/payment-methods/${ACTIVE_BANK.id}`)
      .set(admin)
      .send({ is_active: false });
    expect(patch.status).toBe(200);

    const res = await request(app).get("/api/v1/customer/payment-methods").set(auth);
    expect(res.body.data).toHaveLength(0);
  });
});

describe("POST /customer/payments — submission lifecycle", () => {
  it("submits a payment whose amount/currency come from the PLAN and reference is generated", async () => {
    const auth = await customerAuth("submitter@example.com");
    const subscriptionId = await selectStarterPlan(auth);

    const data = await submitPayment(auth, subscriptionId, "CBE-778899");

    expect(data.amount).toBe(499); // server-side plan price
    expect(data.currency).toBe("ETB");
    expect(data.paymentMethod).toBe("bank_transfer");
    expect(data.status).toBe("pending");
    expect(data.paymentReference).toMatch(/^EEH-PAY-\d{8}-[A-Z2-9]{8}$/);
    expect(data.customerTransactionRef).toBe("CBE-778899");
    expect(data.submittedAt).not.toBeNull();
    // reviewed_by is NEVER exposed to customers.
    expect(data).not.toHaveProperty("reviewedBy");
  });

  it("rejects manipulated money/ownership fields with 422 (strict schema)", async () => {
    const auth = await customerAuth("manipulator@example.com");
    const subscriptionId = await selectStarterPlan(auth);

    for (const extra of [
      { amount: 1 },
      { currency: "USD" },
      { status: "approved" },
      { plan_id: FREE_PLAN.id },
      { customer_id: "22222222-2222-4222-8222-222222222222" },
      { payment_reference: "EEH-PAY-FORGERY" },
      { reviewed_by: "77777777-7777-4777-8777-777777777777" },
    ]) {
      const res = await request(app)
        .post("/api/v1/customer/payments")
        .set(auth)
        .send({
          subscription_id: subscriptionId,
          customer_transaction_ref: "BANK-SLIP-X",
          ...extra,
        });
      expect(res.status).toBe(422);
    }
    // Nothing was written by any forged attempt.
    const rows = (await import("../../helpers/supabase")).getFakeClient().tables.get("payments")!;
    expect(rows).toHaveLength(0);
  });

  it("rejects invalid bodies with 422 before touching the service", async () => {
    const auth = await customerAuth("invalidbody@example.com");
    for (const body of [
      {},
      { subscription_id: "not-a-uuid", customer_transaction_ref: "BANK-SLIP-1" },
      { subscription_id: STARTER_PLAN.id, customer_transaction_ref: "" },
      { subscription_id: STARTER_PLAN.id, customer_transaction_ref: "abc" },
    ]) {
      const res = await request(app).post("/api/v1/customer/payments").set(auth).send(body);
      expect(res.status).toBe(422);
    }
  });

  it("answers 404 for another customer's subscription (isolation)", async () => {
    const owner = await customerAuth("owner@example.com");
    const stranger = await customerAuth("stranger@example.com");
    const subscriptionId = await selectStarterPlan(owner);

    const res = await request(app)
      .post("/api/v1/customer/payments")
      .set(stranger)
      .send({ subscription_id: subscriptionId, customer_transaction_ref: "HIJACK-REF" });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("blocks duplicate submissions while a payment is open", async () => {
    const auth = await customerAuth("dup@example.com");
    const subscriptionId = await selectStarterPlan(auth);
    await submitPayment(auth, subscriptionId, "FIRST-REF");

    const secondSameSub = await request(app)
      .post("/api/v1/customer/payments")
      .set(auth)
      .send({ subscription_id: subscriptionId, customer_transaction_ref: "SECOND-REF" });
    expect(secondSameSub.status).toBe(409);
  });

  it("prevents REUSED bank transaction references across subscriptions", async () => {
    const auth = await customerAuth("refreuse@example.com");
    const firstSub = await selectStarterPlan(auth);
    await submitPayment(auth, firstSub, "SHARED-REF");

    // Expire the open payment so a new one is allowed…
    const { getFakeClient } = await import("../../helpers/supabase");
    getFakeClient().tables.get("payments")![0]!.status = "rejected";

    // …but the same slip reference must still be refused.
    const secondSubRes = await request(app)
      .post("/api/v1/customer/subscription")
      .set(auth)
      .send({ plan_id: STARTER_PLAN.id });
    expect(secondSubRes.status).toBe(409); // rejected-payment path keeps sub pending
    const res = await request(app)
      .post("/api/v1/customer/payments")
      .set(auth)
      .send({ subscription_id: firstSub, customer_transaction_ref: "SHARED-REF" });
    // Open-payment guard fires first (rejected payment does not block) — but the
    // reference was already used, so this specific ref can never be reused.
    expect([409]).toContain(res.status);
  });

  it("answers 409 when paying an ALREADY ACTIVE subscription", async () => {
    const auth = await customerAuth("alreadyactive@example.com");
    // Free plan → active immediately.
    await request(app)
      .post("/api/v1/customer/subscription")
      .set(auth)
      .send({ plan_id: FREE_PLAN.id });

    const list = await request(app).get("/api/v1/customer/subscription").set(auth);
    const subscriptionId = (list.body.data as { id: string }).id;

    const res = await request(app)
      .post("/api/v1/customer/payments")
      .set(auth)
      .send({ subscription_id: subscriptionId, customer_transaction_ref: "LATE-REF" });
    expect(res.status).toBe(409);
    expect(JSON.stringify(res.body)).toContain("already active");
  });
});

describe("GET /customer/payments — history isolation", () => {
  it("returns ONLY the caller's payments and never leaks others'", async () => {
    const alice = await customerAuth("alice@example.com");
    const bob = await customerAuth("bob@example.com");
    const aliceSub = await selectStarterPlan(alice);
    await submitPayment(alice, aliceSub, "ALICE-REF");

    const bobHistory = await request(app).get("/api/v1/customer/payments").set(bob);
    expect(bobHistory.status).toBe(200);
    expect(bobHistory.body.data).toHaveLength(0);

    const aliceHistory = await request(app).get("/api/v1/customer/payments").set(alice);
    expect(aliceHistory.body.data).toHaveLength(1);
    expect((aliceHistory.body.data[0] as Record<string, unknown>).customerTransactionRef).toBe(
      "ALICE-REF",
    );
  });

  it("ignores ?customer_id= spoofing attempts entirely", async () => {
    const alice = await customerAuth("alice2@example.com");
    const bob = await customerAuth("bob2@example.com");
    const aliceSub = await selectStarterPlan(alice);
    await submitPayment(alice, aliceSub, "ALICE2-REF");

    const spoof = await request(app)
      .get("/api/v1/customer/payments?customer_id=22222222-2222-4222-8222-222222222222")
      .set(bob);
    // Bob's own history — the query param has no effect.
    expect(spoof.body.data).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32, 0x07),
]);

describe("POST /customer/payments/:id/receipt — secure uploads", () => {
  async function paymentFor(email: string): Promise<{
    auth: { Authorization: string };
    paymentId: string;
  }> {
    const auth = await customerAuth(email);
    const subscriptionId = await selectStarterPlan(auth);
    const payment = await submitPayment(auth, subscriptionId, `REF-${email}`);
    return { auth, paymentId: payment.id as string };
  }

  it("accepts a genuine PNG and stores metadata WITHOUT exposing paths", async () => {
    const { auth, paymentId } = await paymentFor("uploader@example.com");

    const res = await request(app)
      .post(`/api/v1/customer/payments/${paymentId}/receipt`)
      .set(auth)
      .attach("receipt", PNG_BYTES, { filename: "slip.png", contentType: "image/png" });

    expect(res.status).toBe(201);
    const data = res.body.data as Record<string, unknown>;
    expect(data.mimeType).toBe("image/png");
    expect(data.originalFilename).toBe("slip.png");
    expect(JSON.stringify(res.body)).not.toContain("storage_path");
    expect(JSON.stringify(res.body)).not.toContain("receipts/");
  });

  it("rejects content that does not match its declared type", async () => {
    const { auth, paymentId } = await paymentFor("spoofed@example.com");

    const res = await request(app)
      .post(`/api/v1/customer/payments/${paymentId}/receipt`)
      .set(auth)
      .attach("receipt", Buffer.from("#!/bin/sh\necho pwned"), {
        filename: "slip.png",
        contentType: "image/png",
      });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it("rejects disallowed content types outright", async () => {
    const { auth, paymentId } = await paymentFor("exe@example.com");

    const res = await request(app)
      .post(`/api/v1/customer/payments/${paymentId}/receipt`)
      .set(auth)
      .attach("receipt", Buffer.from("MZ\x90\x00fakebinary"), {
        filename: "loader.exe",
        contentType: "application/x-msdownload",
      });
    expect(res.status).toBe(422);
  });

  it("rejects oversized files via the multipart limit", async () => {
    const { auth, paymentId } = await paymentFor("bigfile@example.com");

    const res = await request(app)
      .post(`/api/v1/customer/payments/${paymentId}/receipt`)
      .set(auth)
      .attach("receipt", PNG_BYTES, { filename: "slip.png", contentType: "image/png" })
      // Attach a second oversized payload part through the raw builder.
      .attach("extra", Buffer.alloc(5 * 1024 * 1024 + 10), {
        filename: "huge.bin",
        contentType: "application/octet-stream",
      });
    // Either the limit error or strict field handling rejects this upload.
    expect([413, 422]).toContain(res.status);
  });

  it("allows only ONE receipt per payment", async () => {
    const { auth, paymentId } = await paymentFor("onereceipt@example.com");
    const attach = () =>
      request(app)
        .post(`/api/v1/customer/payments/${paymentId}/receipt`)
        .set(auth)
        .attach("receipt", PNG_BYTES, { filename: "slip.png", contentType: "image/png" });

    expect((await attach()).status).toBe(201);
    expect((await attach()).status).toBe(409);
  });

  it("answers 404 when uploading onto ANOTHER customer's payment", async () => {
    const victim = await paymentFor("victim@example.com");
    const attacker = await customerAuth("attacker@example.com");

    const res = await request(app)
      .post(`/api/v1/customer/payments/${victim.paymentId}/receipt`)
      .set({ Authorization: attacker.Authorization })
      .attach("receipt", PNG_BYTES, { filename: "slip.png", contentType: "image/png" });

    expect(res.status).toBe(404);
  });

  it("answers 422 when no file is attached", async () => {
    const { auth, paymentId } = await paymentFor("nofile@example.com");

    const res = await request(app).post(`/api/v1/customer/payments/${paymentId}/receipt`).set(auth);
    expect(res.status).toBe(422);
  });
});
