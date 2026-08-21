/**
 * Customer API-key integration tests (Phase 2B).
 *
 * Full HTTP stack via Supertest against the in-memory fake Supabase client:
 * verifies route mounting behind `requireAuth` + `requireRole("customer")`,
 * the one-time-secret contract, customer isolation, secure revocation, and
 * validation error paths end-to-end.
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

beforeEach(() => {
  // The commercial tables must exist in the map (not just as defaults) so the
  // fake client's inserts persist across requests within a test.
  seedFakeClient({
    ...defaultSeed,
    customers: [],
    api_keys: [],
    api_plans: [],
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

  const accessToken = (login.body.data.tokens as { accessToken: string }).accessToken;
  return { Authorization: `Bearer ${accessToken}` };
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
});

describe("GET /customer/api-keys", () => {
  it("lists only the caller's keys — prefixes and statuses, never secrets or hashes", async () => {
    const auth = await customerAuth("lister@example.com");
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
