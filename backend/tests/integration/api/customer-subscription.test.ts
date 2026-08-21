/**
 * Customer plans/subscription integration tests (Phase 2C).
 *
 * Full HTTP stack via Supertest against the in-memory fake Supabase client:
 * guards, catalog visibility, activation semantics (free=active, paid=pending),
 * duplicate rules, validation/mass-assignment rejection, and isolation.
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

import { createApp } from "@/app";
import {
  defaultSeed,
  getFakeClient,
  seedFakeClient,
  setDatabaseConnected,
} from "../../helpers/supabase";

const app = createApp();

const NOW_STAMP = "2026-08-01T00:00:00.000Z";
const FREE_PLAN = { ...basePlan(1), name: "Free", slug: "free", price: 0 };
const STARTER_PLAN = {
  ...basePlan(2),
  name: "Starter",
  slug: "starter",
  price: 900,
  monthly_request_limit: 25000,
  requests_per_minute: 120,
  max_api_keys: 3,
};
const RETIRED_PLAN = { ...basePlan(3), name: "Retired", slug: "retired", is_active: false };

function basePlan(displayOrder: number) {
  return {
    id: `11111111-1111-4111-8111-00000000000${displayOrder}`,
    description: null,
    currency: "ETB",
    billing_interval: "monthly",
    monthly_request_limit: 10000,
    requests_per_minute: 60,
    max_api_keys: 1,
    is_active: true,
    display_order: displayOrder,
    created_at: NOW_STAMP,
    updated_at: NOW_STAMP,
  };
}

beforeEach(() => {
  seedFakeClient({
    ...defaultSeed,
    customers: [],
    api_keys: [],
    api_plans: [FREE_PLAN, STARTER_PLAN, RETIRED_PLAN],
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

/** Logs in the bootstrap admin and returns the bearer header. */
async function adminAuth(): Promise<{ Authorization: string }> {
  const login = await request(app).post("/api/v1/auth/login").send({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  expect(login.status).toBe(200);
  const accessToken = (login.body.data as { tokens: { accessToken: string } }).tokens.accessToken;
  return { Authorization: `Bearer ${accessToken}` };
}

describe("Guards — customer-only surface", () => {
  it("rejects unauthenticated access to every endpoint with 401", async () => {
    const plans = await request(app).get("/api/v1/customer/plans");
    expect(plans.status).toBe(401);

    const getSubscription = await request(app).get("/api/v1/customer/subscription");
    expect(getSubscription.status).toBe(401);

    const select = await request(app)
      .post("/api/v1/customer/subscription")
      .send({ plan_id: FREE_PLAN.id });
    expect(select.status).toBe(401);
  });

  it("rejects an authenticated admin with 403", async () => {
    const admin = await adminAuth();

    const plans = await request(app).get("/api/v1/customer/plans").set(admin);
    expect(plans.status).toBe(403);

    const getSubscription = await request(app).get("/api/v1/customer/subscription").set(admin);
    expect(getSubscription.status).toBe(403);

    const select = await request(app)
      .post("/api/v1/customer/subscription")
      .set(admin)
      .send({ plan_id: FREE_PLAN.id });
    expect(select.status).toBe(403);
  });
});

describe("GET /customer/plans", () => {
  it("returns active plans in catalog order without internal fields", async () => {
    const auth = await customerAuth("catalog@example.com");

    const res = await request(app).get("/api/v1/customer/plans").set(auth);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Plans retrieved.");
    const items = res.body.data as Array<Record<string, unknown>>;
    // The retired plan is hidden.
    expect(items.map((plan) => plan.name)).toEqual(["Free", "Starter"]);
    expect(items[0]).toMatchObject({ price: 0, maxApiKeys: 1, billingInterval: "monthly" });
    expect(items[0]).not.toHaveProperty("is_active");
    expect(JSON.stringify(res.body)).not.toContain('"is_active"');
  });
});

describe("POST /customer/subscription", () => {
  it("activates the FREE plan immediately and stamps the first billing period", async () => {
    const auth = await customerAuth("freeuser@example.com");

    const res = await request(app)
      .post("/api/v1/customer/subscription")
      .set(auth)
      .send({ plan_id: FREE_PLAN.id });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Subscription created.");
    const data = res.body.data as Record<string, unknown>;
    expect(data.status).toBe("active");
    expect(data.startsAt).not.toBeNull();
    expect(data.endsAt).toBeNull();
    expect(data.currentPeriodStart).not.toBeNull();
    expect(data.currentPeriodEnd).not.toBeNull();

    // Row persisted for THIS customer only.
    const rows = getFakeClient().tables.get("subscriptions")!;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ plan_id: FREE_PLAN.id, status: "active" });
  });

  it("creates PAID selections as pending WITHOUT period fields", async () => {
    const auth = await customerAuth("paiduser@example.com");

    const res = await request(app)
      .post("/api/v1/customer/subscription")
      .set(auth)
      .send({ plan_id: STARTER_PLAN.id });

    expect(res.status).toBe(201);
    const data = res.body.data as Record<string, unknown>;
    expect(data.status).toBe("pending");
    expect(data.startsAt).toBeNull();
    expect(data.currentPeriodEnd).toBeNull();
  });

  it("answers 404 for an unknown plan and 409 for an inactive one", async () => {
    const auth = await customerAuth("edgecase@example.com");

    const unknown = await request(app)
      .post("/api/v1/customer/subscription")
      .set(auth)
      .send({ plan_id: "99999999-9999-4999-8999-999999999999" });
    expect(unknown.status).toBe(404);
    expect(unknown.body.success).toBe(false);

    const retired = await request(app)
      .post("/api/v1/customer/subscription")
      .set(auth)
      .send({ plan_id: RETIRED_PLAN.id });
    expect(retired.status).toBe(409);

    expect(getFakeClient().tables.get("subscriptions")).toHaveLength(0);
  });

  it("refuses switching while an active subscription exists (409), then allows it after expiry simulation", async () => {
    const auth = await customerAuth("switcher@example.com");

    const first = await request(app)
      .post("/api/v1/customer/subscription")
      .set(auth)
      .send({ plan_id: FREE_PLAN.id });
    expect(first.status).toBe(201);

    const blocked = await request(app)
      .post("/api/v1/customer/subscription")
      .set(auth)
      .send({ plan_id: STARTER_PLAN.id });
    expect(blocked.status).toBe(409);
    expect(getFakeClient().tables.get("subscriptions")).toHaveLength(1);

    // Simulate expiry by stamping the row terminal, then re-select.
    const row = getFakeClient().tables.get("subscriptions")![0]!;
    row.status = "expired";
    const second = await request(app)
      .post("/api/v1/customer/subscription")
      .set(auth)
      .send({ plan_id: STARTER_PLAN.id });
    expect(second.status).toBe(201);
    const rows = getFakeClient().tables.get("subscriptions")!;
    expect(rows).toHaveLength(2); // INSERT, history preserved
  });

  it("rejects invalid bodies with 422 — including backend-controlled fields", async () => {
    const auth = await customerAuth("validator@example.com");

    for (const body of [
      {},
      { plan_id: "not-a-uuid" },
      {
        plan_id: FREE_PLAN.id,
        status: "active",
        price: -5,
        starts_at: "2026-01-01T00:00:00.000Z",
        current_period_end: "2030-01-01T00:00:00.000Z",
        customer_id: "88888888-8888-4888-8888-888888888888",
      },
    ]) {
      const res = await request(app)
        .post("/api/v1/customer/subscription")
        .set(auth)
        .send(body as object);
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    }
    expect(getFakeClient().tables.get("subscriptions")).toHaveLength(0);
  });
});

describe("GET /customer/subscription", () => {
  it("answers 404 when nothing has ever been selected — no record is invented", async () => {
    const auth = await customerAuth("empty@example.com");

    const res = await request(app).get("/api/v1/customer/subscription").set(auth);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(getFakeClient().tables.get("subscriptions")).toHaveLength(0);
  });

  it("returns the customer's latest subscription after selection", async () => {
    const auth = await customerAuth("getter@example.com");
    await request(app).post("/api/v1/customer/subscription").set(auth).send({
      plan_id: STARTER_PLAN.id,
    });

    const res = await request(app).get("/api/v1/customer/subscription").set(auth);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Subscription retrieved.");
    const data = res.body.data as Record<string, unknown>;
    expect(data.planId).toBe(STARTER_PLAN.id);
    expect(data.status).toBe("pending");
  });

  it("never exposes another customer's subscription (isolation)", async () => {
    const owner = await customerAuth("owner@example.com");
    const stranger = await customerAuth("stranger@example.com");
    await request(app)
      .post("/api/v1/customer/subscription")
      .set(owner)
      .send({ plan_id: FREE_PLAN.id });

    const foreign = await request(app).get("/api/v1/customer/subscription").set(stranger);
    expect(foreign.status).toBe(404);

    const own = await request(app).get("/api/v1/customer/subscription").set(owner);
    expect(own.status).toBe(200);
    expect((own.body.data as Record<string, unknown>).planId).toBe(FREE_PLAN.id);
  });
});
