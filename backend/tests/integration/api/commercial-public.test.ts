/**
 * Commercial public API integration tests (Phase 4).
 *
 * Full HTTP stack via Supertest over the fake Supabase client, exercising the
 * COMPLETE commercial pipeline: register → subscribe (free activates) →
 * create API key → call /public/* with the key → RPM + quota enforcement →
 * usage metering → customer usage endpoints.
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

// This suite makes 100+ requests from one IP and would exhaust the app's
// general limiter / slow-down budgets (covered by their own unit tests) —
// replace them with pass-throughs so the COMMERCIAL limits under test are
// the only ones in play.
vi.mock("@/middleware/rate-limit", () => {
  const passthrough = () => (_req: unknown, _res: unknown, next: () => void) => next();
  return {
    createGeneralLimiter: passthrough,
    createStrictLimiter: passthrough,
    createAuthLimiter: passthrough,
  };
});
vi.mock("@/middleware/slow-down", () => ({
  createSlowDown: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Real timers: supertest + fake timers interact badly with the limiter
// middleware stack. Billing-period determinism is not needed — period values
// are read back from API responses, and every manipulated date below is an
// absolute timestamp safely in the past/future of the real clock.

import { createApp } from "@/app";
import { resetCommercialRateLimiter } from "@/middleware/commercial-rate-limit";
import { resetLastUsedThrottle } from "@/middleware/commercial-metering";
import { defaultSeed, getFakeClient, seedFakeClient } from "../../helpers/supabase";

const app = createApp();

const STAMP = "2026-08-01T00:00:00.000Z";

/** Catalog fixtures mirroring the documented plans exactly (spec Part P). */
const FREE_PLAN = {
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
  created_at: STAMP,
  updated_at: STAMP,
};

const STARTER_PLAN = {
  ...FREE_PLAN,
  id: "11111111-1111-4111-8111-000000000002",
  name: "Starter",
  slug: "starter",
  price: 499,
  monthly_request_limit: 25000,
  requests_per_minute: 60,
  max_api_keys: 2,
  display_order: 2,
};

beforeEach(() => {
  // Fresh tables AND fresh limiter/throttle state per test — the limiter and
  // last-used throttle are process-wide singletons.
  seedFakeClient({
    ...defaultSeed,
    customers: [],
    users: [],
    api_keys: [],
    api_plans: [FREE_PLAN, STARTER_PLAN],
    subscriptions: [],
    api_usage: [],
  });
  resetCommercialRateLimiter();
  resetLastUsedThrottle();
});

interface CustomerSession {
  token: string;
  apiKey: string;
  keyId: string;
  keyPrefix: string;
}

async function authedCustomer(email: string): Promise<{ Authorization: string }> {
  const register = await request(app).post("/api/v1/auth/register").send({
    email,
    password: "StrongPassword123!",
    company_name: "Example Company",
  });
  if (register.status !== 201) throw new Error(`register failed: ${JSON.stringify(register.body)}`);
  const login = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password: "StrongPassword123!" });
  return {
    Authorization: `Bearer ${(login.body.data as { tokens: { accessToken: string } }).tokens.accessToken}`,
  };
}

/**
 * Registers a customer, activates the FREE plan (immediate activation), and
 * creates one API key — returning the FULL key secret captured at creation.
 */
async function fullCustomer(
  email: string,
): Promise<{ jwt: { Authorization: string }; session: CustomerSession }> {
  const jwt = await authedCustomer(email);
  const sub = await request(app)
    .post("/api/v1/customer/subscription")
    .set(jwt)
    .send({ plan_id: FREE_PLAN.id });
  if (sub.status !== 201) throw new Error(`subscribe failed: ${JSON.stringify(sub.body)}`);

  const key = await request(app).post("/api/v1/customer/api-keys").set(jwt).send({ name: "prod" });
  if (key.status !== 201) throw new Error(`key failed: ${JSON.stringify(key.body)}`);
  const data = key.body.data as { id: string; keyPrefix: string; key: string };
  return {
    jwt,
    session: { token: data.key, keyId: data.id, keyPrefix: data.keyPrefix, apiKey: data.key },
  };
}

function bearer(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/** Drains pending microtasks so fire-and-forget metering writes land. */
async function flush(): Promise<void> {
  for (let i = 0; i < 25; i++) await Promise.resolve();
}

/** ISO timestamp `offsetMs` from the real clock (robust against time rot). */
function isoOffset(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

describe("Authentication — API key is the ONLY accepted credential", () => {
  it.each([
    ["missing header", undefined],
    ["garbage token", "Bearer garbage"],
    ["wrong scheme", "Basic dXNlcjpwYXNz"],
    ["well-formed but unknown key", `eeh_live_${"A".repeat(43)}`],
  ] as const)("%s -> 401", async (_name, authorization) => {
    await fullCustomer("auth-setup@example.com");
    const req = request(app).get("/api/v1/public/rates/latest");
    const res =
      authorization === undefined ? await req : await req.set({ Authorization: authorization });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Missing or invalid API key.");
  });

  it("rejects a customer JWT on the commercial surface (API keys only)", async () => {
    await fullCustomer("jwt-vs-key@example.com");
    const { jwt } = await fullCustomer("second-jwt@example.com");
    const res = await request(app).get("/api/v1/public/rates/latest").set(jwt);
    expect(res.status).toBe(401);
  });

  it("revoked keys cannot be reused", async () => {
    const { jwt, session } = await fullCustomer("revoke@example.com");
    const ok = await request(app).get("/api/v1/public/rates/latest").set(bearer(session.token));
    expect(ok.status).toBe(200);

    const revoke = await request(app).delete(`/api/v1/customer/api-keys/${session.keyId}`).set(jwt);
    expect(revoke.status).toBe(200);

    const after = await request(app).get("/api/v1/public/rates/latest").set(bearer(session.token));
    expect(after.status).toBe(401);
    expect(after.body.message).toContain("revoked");
  });

  it("expired keys are rejected", async () => {
    const { session } = await fullCustomer("expired@example.com");
    getFakeClient().tables.get("api_keys")![0]!.expires_at = isoOffset(-86_400_000);
    const res = await request(app).get("/api/v1/public/rates/latest").set(bearer(session.token));
    expect(res.status).toBe(401);
    expect(res.body.message).toContain("expired");
  });
});

describe("Subscription enforcement — valid key, unusable subscription", () => {
  it.each(["pending", "expired", "cancelled", "suspended"] as const)(
    "%s subscription -> 403",
    async (status) => {
      const { session } = await fullCustomer(`sub-${status}@example.com`);
      getFakeClient().tables.get("subscriptions")![0]!.status = status;
      const res = await request(app).get("/api/v1/public/rates/latest").set(bearer(session.token));
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    },
  );

  it("an active status whose period already ended -> 403 (never silently renews)", async () => {
    const { session } = await fullCustomer("period@example.com");
    const yesterday = isoOffset(-86_400_000);
    getFakeClient().tables.get("subscriptions")![0]!.current_period_start = isoOffset(
      -30 * 86_400_000,
    );
    getFakeClient().tables.get("subscriptions")![0]!.current_period_end = yesterday;
    const res = await request(app).get("/api/v1/public/rates/latest").set(bearer(session.token));
    expect(res.status).toBe(403);
    expect(res.body.message).toContain("expired");

    // The middleware must NOT have modified subscription state.
    const row = getFakeClient().tables.get("subscriptions")![0]!;
    expect(row.status).toBe("active");
    expect(row.current_period_end).toBe(yesterday);
  });
});

describe("Data endpoints — gated view over the shared rate services", () => {
  let token: string;
  beforeEach(async () => {
    ({ token } = (await fullCustomer("data@example.com")).session);
  });

  it("GET /public/rates/latest returns the resolved snapshot", async () => {
    const res = await request(app).get("/api/v1/public/rates/latest").set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const rows = res.body.data as Array<Record<string, unknown>>;
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row).toHaveProperty("bank_code");
      expect(row).toHaveProperty("currency_code");
      expect(row).toHaveProperty("rate_date");
      expect(row).toHaveProperty("stale");
    }
  });

  it("GET /public/rates/latest/:bankCode filters to one bank", async () => {
    const all = await request(app).get("/api/v1/public/rates/latest").set(bearer(token));
    const banks = new Set(
      (all.body.data as Array<{ bank_code: string }>).map((row) => row.bank_code),
    );
    const code = [...banks][0]!;
    const res = await request(app).get(`/api/v1/public/rates/latest/${code}`).set(bearer(token));
    expect(res.status).toBe(200);
    expect(
      (res.body.data as Array<{ bank_code: string }>).every((row) => row.bank_code === code),
    ).toBe(true);
  });

  it("GET /public/rates/latest/:bankCode/:currencyCode returns a row or null", async () => {
    const res = await request(app).get("/api/v1/public/rates/latest/CBE/USD").set(bearer(token));
    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data === null || typeof data === "object").toBe(true);
  });

  it("GET /public/rates/history/:bankCode/:currencyCode returns dated rows oldest first", async () => {
    const res = await request(app).get("/api/v1/public/rates/history/CBE/USD").set(bearer(token));
    expect(res.status).toBe(200);
    const dates = (res.body.data as Array<{ rate_date: string }>).map((row) => row.rate_date);
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
  });

  it("invalid currency codes answer 422", async () => {
    const res = await request(app)
      .get("/api/v1/public/rates/latest/CBE/TOOLONGCODE")
      .set(bearer(token));
    expect(res.status).toBe(422);
  });

  it("unknown bank answers 404 through the shared service", async () => {
    const res = await request(app).get("/api/v1/public/rates/latest/NOPE/USD").set(bearer(token));
    expect(res.status).toBe(404);
  });

  it("GET /public/banks serves ACTIVE banks only; unknown bank -> 404", async () => {
    const list = await request(app).get("/api/v1/public/banks").set(bearer(token));
    expect(list.status).toBe(200);
    const rows = list.body.data as Array<Record<string, unknown>>;
    expect(rows.length).toBeGreaterThan(0);

    // Deactivate every bank; the commercial directory must empty out.
    const banks = getFakeClient().tables.get("banks")!;
    for (const bank of banks) bank.is_active = false;
    const after = await request(app).get("/api/v1/public/banks").set(bearer(token));
    expect(after.body.data).toHaveLength(0);

    const single = await request(app).get("/api/v1/public/banks/CBE").set(bearer(token));
    expect(single.status).toBe(404);
  });
});

describe("Plan-based rate limiting (RPM)", () => {
  it("admits requests under the limit and returns 429 with headers above it", async () => {
    const { session } = await fullCustomer("rpm@example.com");

    let last!: request.Response;
    for (let i = 0; i < FREE_PLAN.requests_per_minute; i++) {
      last = await request(app).get("/api/v1/public/rates/latest").set(bearer(session.token));
      expect(last.status).toBe(200);
    }
    expect(last.headers["x-ratelimit-limit"]).toBe("30");
    // After the 30th admitted request the window is fully consumed.
    expect(last.headers["x-ratelimit-remaining"]).toBe("0");

    const over = await request(app).get("/api/v1/public/rates/latest").set(bearer(session.token));
    expect(over.status).toBe(429);
    expect(over.body.message).toContain("per minute");
    expect(over.headers["x-ratelimit-limit"]).toBe("30");
    expect(over.headers["x-ratelimit-remaining"]).toBe("0");
    expect(Number(over.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("separate customers/keys never share an RPM bucket", async () => {
    const a = await fullCustomer("rpm-a@example.com");
    const b = await fullCustomer("rpm-b@example.com");

    for (let i = 0; i < FREE_PLAN.requests_per_minute; i++) {
      const res = await request(app)
        .get("/api/v1/public/rates/latest")
        .set(bearer(a.session.token));
      expect(res.status).toBe(200);
    }
    // A is exhausted…
    const aOver = await request(app)
      .get("/api/v1/public/rates/latest")
      .set(bearer(a.session.token));
    expect(aOver.status).toBe(429);
    // …but B still sails through.
    const bOk = await request(app).get("/api/v1/public/rates/latest").set(bearer(b.session.token));
    expect(bOk.status).toBe(200);
    expect(bOk.headers["x-ratelimit-limit"]).toBe("30");
  });

  it("a higher plan gets its own larger budget (Starter 60)", async () => {
    const buyer = await fullCustomer("starter-rpm@example.com");
    getFakeClient().tables.get("subscriptions")![0]!.plan_id = STARTER_PLAN.id;

    const res = await request(app)
      .get("/api/v1/public/rates/latest")
      .set(bearer(buyer.session.token));
    expect(res.status).toBe(200);
    expect(res.headers["x-ratelimit-limit"]).toBe("60");
  });
});

describe("Monthly quota metering", () => {
  async function currentPeriod(jwt: { Authorization: string }): Promise<{
    start: string;
    end: string;
    subscriptionId: string;
  }> {
    const sub = await request(app).get("/api/v1/customer/subscription").set(jwt);
    const data = sub.body.data as {
      currentPeriodStart: string;
      currentPeriodEnd: string;
      id: string;
    };
    return { start: data.currentPeriodStart, end: data.currentPeriodEnd, subscriptionId: data.id };
  }

  it("counts successful requests and exposes quota headers", async () => {
    const { jwt, session } = await fullCustomer("meter@example.com");
    const period = await currentPeriod(jwt);

    const res = await request(app).get("/api/v1/public/rates/latest").set(bearer(session.token));
    expect(res.status).toBe(200);
    expect(res.headers["x-quota-limit"]).toBe("2000");
    expect(res.headers["x-quota-reset"]).toBe(period.start);

    await flush();
    const usage = getFakeClient().tables.get("api_usage")!;
    expect(usage).toHaveLength(1);
    expect(usage[0]!.request_count).toBe(1);
    expect(usage[0]!.period_start).toBe(period.start);
    expect(usage[0]!.subscription_id).toBe(period.subscriptionId);
  });

  it("does NOT count failed requests (404 data errors, 401 auth failures)", async () => {
    const { session } = await fullCustomer("no-meter-on-fail@example.com");

    await request(app).get("/api/v1/public/rates/latest/NOPE/USD").set(bearer(session.token)); // 404
    await request(app)
      .get("/api/v1/public/rates/latest")
      .set(bearer(`eeh_live_${"b".repeat(43)}`)); // 401

    await flush();
    expect(getFakeClient().tables.get("api_usage") ?? []).toHaveLength(0);
  });

  it("blocks with a DISTINCT message once the monthly limit is reached", async () => {
    const { jwt, session } = await fullCustomer("quota@example.com");
    const period = await currentPeriod(jwt);

    // Simulate a fully-consumed period directly in the aggregated table.
    getFakeClient().tables.get("api_usage")!.push({
      id: "66666666-6666-4666-8666-666666666661",
      api_key_id: session.keyId,
      subscription_id: period.subscriptionId,
      period_start: period.start,
      request_count: FREE_PLAN.monthly_request_limit,
      created_at: STAMP,
      updated_at: STAMP,
    });

    const res = await request(app).get("/api/v1/public/rates/latest").set(bearer(session.token));
    expect(res.status).toBe(429);
    expect(res.body.message).toContain("Monthly quota exceeded");
    expect(res.headers["x-quota-limit"]).toBe("2000");
    expect(res.headers["x-quota-remaining"]).toBe("0");
  });

  it("a NEW billing period starts a fresh counter (old period untouched)", async () => {
    const { jwt, session } = await fullCustomer("renewal@example.com");
    const period = await currentPeriod(jwt);
    getFakeClient().tables.get("api_usage")!.push({
      id: "66666666-6666-4666-8666-666666666662",
      api_key_id: session.keyId,
      subscription_id: period.subscriptionId,
      period_start: period.start,
      request_count: FREE_PLAN.monthly_request_limit,
      created_at: STAMP,
      updated_at: STAMP,
    });

    // Admin approval of a renewal stamps a fresh monthly period. The new
    // window must already have STARTED (start <= now) or auth rejects it.
    const subs = getFakeClient().tables.get("subscriptions")!;
    const newStart = isoOffset(-86_400_000);
    subs[0]!.current_period_start = newStart;
    subs[0]!.current_period_end = isoOffset(30 * 86_400_000);

    const res = await request(app).get("/api/v1/public/rates/latest").set(bearer(session.token));
    expect(res.status).toBe(200);

    await flush();
    const usage = getFakeClient().tables.get("api_usage")!;
    expect(usage).toHaveLength(2);
    const newRow = usage.find((row) => row.period_start === newStart);
    expect(newRow?.request_count).toBe(1);
    const oldRow = usage.find((row) => row.period_start === period.start);
    expect(oldRow?.request_count).toBe(FREE_PLAN.monthly_request_limit);
  });

  it("stamps last_used_at after successful use (throttled)", async () => {
    const { session } = await fullCustomer("lastused@example.com");
    // Inserted rows may omit null columns entirely (undefined vs null).
    expect(
      (getFakeClient().tables.get("api_keys")![0]! as { last_used_at?: string | null })
        .last_used_at ?? null,
    ).toBeNull();

    await request(app).get("/api/v1/public/rates/latest").set(bearer(session.token));
    await flush();
    const key = getFakeClient().tables.get("api_keys")![0]! as { last_used_at: string | null };
    expect(key.last_used_at).not.toBeNull();
  });
});

describe("Security invariants", () => {
  it("the database stores ONLY prefix + hash — never the plaintext key", async () => {
    const { session } = await fullCustomer("store@example.com");
    const stored = JSON.stringify(getFakeClient().tables.get("api_keys"));
    expect(stored).not.toContain(session.apiKey);
    expect(stored).toContain(session.keyPrefix);
  });

  it("commercial responses never leak hashes, secrets, or internal ids", async () => {
    const { jwt, session } = await fullCustomer("leak@example.com");
    const res = await request(app).get("/api/v1/public/rates/latest").set(bearer(session.token));
    const body = JSON.stringify(res.body);
    expect(body).not.toContain(session.apiKey);
    expect(body).not.toContain("key_hash");
    expect(body).not.toContain("customer_id");
    expect(body).not.toContain("plan_id");

    const usage = await request(app).get("/api/v1/customer/usage").set(jwt);
    const usageBody = JSON.stringify(usage.body);
    expect(usageBody).not.toContain(session.apiKey);
    expect(usageBody).not.toContain("keyHash");
    expect(usageBody.toLowerCase()).not.toContain("hash");
  });

  it("client-supplied identity params cannot cross the isolation boundary", async () => {
    const victim = await fullCustomer("victim-isolation@example.com");
    const attackerJwt = await authedCustomer("attacker-isolation@example.com");

    // ?customer_id= style spoofing is ignored by design (ownership from JWT).
    const spoofed = await request(app)
      .get(`/api/v1/customer/usage?customer_id=${"22222222-2222-4222-8222-222222222299"}`)
      .set(attackerJwt);
    expect(spoofed.status).toBe(200);
    expect((spoofed.body.data as { keys: unknown[] }).keys).toHaveLength(0);

    // Another customer's key id answers 404 on the per-key endpoint.
    const foreign = await request(app)
      .get(`/api/v1/customer/usage/${victim.session.keyId}`)
      .set(attackerJwt);
    expect(foreign.status).toBe(404);
  });
});

describe("Customer usage endpoints", () => {
  it("reports plan, limits, and consumption after real traffic", async () => {
    const { jwt, session } = await fullCustomer("usage-view@example.com");
    await request(app).get("/api/v1/public/rates/latest").set(bearer(session.token));
    await flush();

    const res = await request(app).get("/api/v1/customer/usage").set(jwt);
    expect(res.status).toBe(200);
    const data = res.body.data as {
      subscription: { planSlug: string; requestsPerMinute: number } | null;
      monthlyLimit: number | null;
      requestsUsed: number;
      requestsRemaining: number | null;
      keys: Array<{ keyPrefix: string; requestsUsed: number }>;
    };
    expect(data.subscription?.planSlug).toBe("free");
    expect(data.subscription?.requestsPerMinute).toBe(30);
    expect(data.monthlyLimit).toBe(2000);
    expect(data.requestsUsed).toBe(1);
    expect(data.requestsRemaining).toBe(1999);
    expect(data.keys[0]?.keyPrefix).toMatch(/^eeh_live_/);
    expect(data.keys[0].requestsUsed).toBe(1);
  });

  it("reports zeroed usage without an active subscription", async () => {
    const jwt = await authedCustomer("nosub@example.com");
    const res = await request(app).get("/api/v1/customer/usage").set(jwt);
    expect(res.status).toBe(200);
    const data = res.body.data as Record<string, unknown>;
    expect(data.subscription).toBeNull();
    expect(data.monthlyLimit).toBeNull();
    expect(data.requestsUsed).toBe(0);
  });

  it("per-key usage endpoint works for owned keys only", async () => {
    const { jwt, session } = await fullCustomer("perkey@example.com");
    await request(app).get("/api/v1/public/rates/latest").set(bearer(session.token));
    await flush();

    const own = await request(app).get(`/api/v1/customer/usage/${session.keyId}`).set(jwt);
    expect(own.status).toBe(200);
    const keyData = own.body.data as {
      requestsUsed: number;
      key: { keyPrefix: string };
    };
    expect(keyData.requestsUsed).toBe(1);
    expect(keyData.key.keyPrefix).toMatch(/^eeh_live_/);
  });
});
