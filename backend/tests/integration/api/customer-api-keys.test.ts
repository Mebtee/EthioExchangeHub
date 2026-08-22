/**
 * Customer API-key integration tests (Phase 2B + Phase 2C gate).
 *
 * Full HTTP stack via Supertest against the in-memory fake Supabase client:
 * verifies route mounting behind `requireAuth` + `requireRole("customer")`,
 * the one-time-secret contract, customer isolation, secure revocation, and
 * validation error paths end-to-end. Since Phase 2C, key creation REQUIRES an
 * active subscription, so these flows activate the Free plan first via
 * `POST /customer/subscription`.
 */

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createHash } from "node:crypto";

vi.mock("@/lib/supabase", async () => {
  const { getFakeClient, isDatabaseConnected } = await import("../../helpers/supabase");
  return {
    getSupabase: () => getFakeClient(),
    verifyDatabaseConnection: async () => isDatabaseConnected(),
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

/** Catalog fixture mirroring the documented Free plan (0 ETB / 2,000 req/mo / 30 RPM / 1 key). */
export const FREE_PLAN = {
  id: "11111111-1111-4111-8111-000000000001",
  name: "Free",
  slug: "free",
  description: "For evaluation and light integration work.",
  price: 0,
  currency: "ETB",
  billing_interval: "monthly",
  monthly_request_limit: 2000,
  requests_per_minute: 30,
  max_api_keys: 1,
  is_active: true,
  display_order: 1,
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-01T00:00:00.000Z",
};

beforeEach(() => {
  // The commercial tables must exist in the map (not just as defaults) so the
  // fake client's inserts persist across requests within a test.
  seedFakeClient({
    ...defaultSeed,
    customers: [],
    api_keys: [],
    api_plans: [FREE_PLAN],
    subscriptions: [],
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

/**
 * Activates the Free plan for the caller (free plans activate immediately —
 * no payment step). Key creation requires an ACTIVE subscription since 2C.
 */
async function activateFreePlan(auth: { Authorization: string }): Promise<void> {
  const res = await request(app)
    .post("/api/v1/customer/subscription")
    .set(auth)
    .send({ plan_id: FREE_PLAN.id });
  expect(res.status).toBe(201);
}

/** Logs in the bootstrap admin (provisioned on first login) and returns the bearer header. */
async function adminAuth(): Promise<{ Authorization: string }> {
  const login = await request(app).post("/api/v1/auth/login").send({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  expect(login.status).toBe(200);
  const accessToken = (login.body.data.tokens as { accessToken: string }).accessToken;
  return { Authorization: `Bearer ${accessToken}` };
}

describe("Customer API-key guards", () => {
  it("rejects unauthenticated access to every endpoint with 401", async () => {
    const list = await request(app).get("/api/v1/customer/api-keys");
    expect(list.status).toBe(401);
    expect(list.body.success).toBe(false);

    const create = await request(app)
      .post("/api/v1/customer/api-keys")
      .send({ name: "Production API" });
    expect(create.status).toBe(401);

    const revoke = await request(app).delete(
      "/api/v1/customer/api-keys/33333333-3333-4333-8333-333333333331",
    );
    expect(revoke.status).toBe(401);
  });

  it("rejects an authenticated admin with 403 — customers only", async () => {
    const admin = await adminAuth();

    const list = await request(app).get("/api/v1/customer/api-keys").set(admin);
    expect(list.status).toBe(403);

    const create = await request(app)
      .post("/api/v1/customer/api-keys")
      .set(admin)
      .send({ name: "Production API" });
    expect(create.status).toBe(403);

    const revoke = await request(app)
      .delete("/api/v1/customer/api-keys/33333333-3333-4333-8333-333333333331")
      .set(admin);
    expect(revoke.status).toBe(403);
  });
});

describe("POST /customer/api-keys", () => {
  it("creates a key and returns the full secret exactly once", async () => {
    const auth = await customerAuth("creator@example.com");
    await activateFreePlan(auth);

    const res = await request(app)
      .post("/api/v1/customer/api-keys")
      .set(auth)
      .send({ name: "Production API", expires_at: "2027-08-21T00:00:00.000Z" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ success: true, message: "API key created successfully." });

    const data = res.body.data as {
      id: string;
      name: string;
      key: string;
      keyPrefix: string;
      expiresAt: string;
      revokedAt: null;
    };
    expect(data.key.startsWith("eeh_live_")).toBe(true);
    expect(data.keyPrefix).toMatch(/^eeh_live_[A-Za-z0-9_-]{8}$/);
    expect(data.key.startsWith(data.keyPrefix)).toBe(true);
    expect(data.expiresAt).toBe("2027-08-21T00:00:00.000Z");
    expect(data.revokedAt).toBeNull();
    expect(data).not.toHaveProperty("keyHash");

    // Database stores ONLY prefix + SHA-256 hash — never plaintext.
    const row = getFakeClient().tables.get("api_keys")![0]! as Record<string, unknown>;
    expect(row.key_prefix).toBe(data.keyPrefix);
    expect(row.key_hash).toBe(createHash("sha256").update(data.key, "utf8").digest("hex"));
    expect(JSON.stringify(row)).not.toContain(data.key);
  });

  it("rejects invalid bodies with 422 (empty name / past expiration / unknown fields)", async () => {
    const auth = await customerAuth("validator@example.com");

    for (const body of [
      {},
      { name: "" },
      { name: "x".repeat(101) },
      { name: "k", expires_at: "2020-01-01T00:00:00.000Z" },
      { name: "k", expires_at: "someday" },
      { name: "k", customer_id: "99999999-9999-4999-8999-999999999999" },
    ]) {
      const res = await request(app)
        .post("/api/v1/customer/api-keys")
        .set(auth)
        .send(body as object);
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    }
  });

  it("answers 409 when the caller has NO active subscription (Phase 2C gate)", async () => {
    const auth = await customerAuth("nosubscription@example.com");
    const res = await request(app)
      .post("/api/v1/customer/api-keys")
      .set(auth)
      .send({ name: "Production API" });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    // Nothing was written.
    expect(getFakeClient().tables.get("api_keys")).toHaveLength(0);
  });

  it("enforces the plan's max_api_keys end-to-end (free plan allows one non-revoked key)", async () => {
    const auth = await customerAuth("limited@example.com");
    await activateFreePlan(auth);

    const first = await request(app)
      .post("/api/v1/customer/api-keys")
      .set(auth)
      .send({ name: "Only key" });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/v1/customer/api-keys")
      .set(auth)
      .send({ name: "Over quota" });
    expect(second.status).toBe(409);
    expect(second.body.success).toBe(false);

    // Revoking frees the slot — only NON-revoked keys count against the cap.
    const keyId = (first.body.data as { id: string }).id;
    const revoke = await request(app).delete(`/api/v1/customer/api-keys/${keyId}`).set(auth);
    expect(revoke.status).toBe(200);
    const retry = await request(app)
      .post("/api/v1/customer/api-keys")
      .set(auth)
      .send({ name: "Replacement" });
    expect(retry.status).toBe(201);
  });
});

describe("GET /customer/api-keys", () => {
  it("lists only the caller's keys — prefixes and statuses, never secrets or hashes", async () => {
    const auth = await customerAuth("lister@example.com");
    await activateFreePlan(auth);
    const created = await request(app)
      .post("/api/v1/customer/api-keys")
      .set(auth)
      .send({ name: "Production API" });
    expect(created.status).toBe(201);

    const res = await request(app).get("/api/v1/customer/api-keys").set(auth);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const items = res.body.data as Array<Record<string, unknown>>;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      name: "Production API",
      keyPrefix: created.body.data.keyPrefix,
    });
    expect(items[0]).not.toHaveProperty("key");
    expect(JSON.stringify(res.body)).not.toContain(created.body.data.key as string);
    expect(JSON.stringify(res.body)).not.toContain('"key_hash"');
  });
});

describe("DELETE /customer/api-keys/:id — secure revocation", () => {
  it("stamps revoked_at without deleting and keeps the key listed", async () => {
    const auth = await customerAuth("revoker@example.com");
    await activateFreePlan(auth);
    const created = await request(app)
      .post("/api/v1/customer/api-keys")
      .set(auth)
      .send({ name: "Short-lived" });
    const keyId = (created.body.data as { id: string }).id;

    const revoke = await request(app).delete(`/api/v1/customer/api-keys/${keyId}`).set(auth);
    expect(revoke.status).toBe(200);
    expect(revoke.body.message).toBe("API key revoked.");
    expect((revoke.body.data as { revokedAt: string }).revokedAt).not.toBeNull();

    const row = getFakeClient().tables.get("api_keys")![0]! as Record<string, unknown>;
    expect(row.revoked_at).not.toBeNull();

    const list = await request(app).get("/api/v1/customer/api-keys").set(auth);
    const listed = (list.body.data as Array<Record<string, unknown>>)[0]!;
    expect(listed.revokedAt).not.toBeNull();
  });

  it("answers 404 when revoking another customer's key (isolation)", async () => {
    const owner = await customerAuth("owner@example.com");
    const stranger = await customerAuth("stranger@example.com");
    await activateFreePlan(owner);
    await activateFreePlan(stranger);

    const created = await request(app)
      .post("/api/v1/customer/api-keys")
      .set(owner)
      .send({ name: "Owner key" });
    const keyId = (created.body.data as { id: string }).id;

    const foreignList = await request(app).get("/api/v1/customer/api-keys").set(stranger);
    expect(foreignList.body.data).toHaveLength(0);

    const revoke = await request(app).delete(`/api/v1/customer/api-keys/${keyId}`).set(stranger);
    expect(revoke.status).toBe(404);
    expect(revoke.body.success).toBe(false);

    // The owner's key is untouched.
    const row = getFakeClient().tables.get("api_keys")![0]! as Record<string, unknown>;
    expect(row.revoked_at).toBeNull();
  });

  it("rejects a malformed key id with 422 before touching the service", async () => {
    const auth = await customerAuth("paramcheck@example.com");
    const res = await request(app).delete("/api/v1/customer/api-keys/not-a-uuid").set(auth);
    expect(res.status).toBe(422);
  });
});
