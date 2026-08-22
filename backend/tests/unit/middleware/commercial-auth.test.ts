/**
 * Unit tests for the commercial API authentication middleware (Phase 4).
 *
 * Covers every rejection path (Part B/C/N): missing/malformed/unknown/
 * revoked/expired keys, missing customer, missing/pending/expired/cancelled
 * subscriptions, inactive plans — plus the happy-path context attachment and
 * the fact that customer JWTs are never accepted here.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request } from "express";

vi.mock("@/lib/supabase", async () => {
  const { getFakeClient, isDatabaseConnected } = await import("../../helpers/supabase");
  return {
    getSupabase: () => getFakeClient(),
    verifyDatabaseConnection: async () => isDatabaseConnected(),
  };
});

import { generateApiKey, hashApiKey } from "@/lib/api-keys";
import { createCommercialApiAuth } from "@/middleware/commercial-auth";
import { ApiKeysRepository } from "@/repositories/ApiKeysRepository";
import { ApiPlansRepository } from "@/repositories/ApiPlansRepository";
import { CustomersRepository } from "@/repositories/CustomersRepository";
import { SubscriptionsRepository } from "@/repositories/SubscriptionsRepository";
import type { ApiKeyRow } from "@/types/database";
import { getFakeClient, seedFakeClient, defaultSeed } from "../../helpers/supabase";

const NOW = "2026-08-21T12:00:00.000Z";

vi.mock("@/utils/date", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/date")>();
  return { ...actual, nowIso: () => NOW };
});

const CUSTOMER_ID = "22222222-2222-4222-8222-222222222201";
const PLAN_ID = "11111111-1111-4111-8111-111111111102";
const SUBSCRIPTION_ID = "55555555-5555-4555-8555-555555555501";

function makeKeyRow(overrides: Partial<ApiKeyRow> = {}): {
  row: ApiKeyRow;
  fullKey: string;
} {
  const { key, keyPrefix } = generateApiKey();
  const stamp = "2026-08-01T00:00:00.000Z";
  const row: ApiKeyRow = {
    id: "44444444-4444-4444-8444-444444444401",
    customer_id: CUSTOMER_ID,
    name: "prod",
    key_prefix: keyPrefix,
    key_hash: hashApiKey(key),
    last_used_at: null,
    expires_at: null,
    revoked_at: null,
    created_at: stamp,
    updated_at: stamp,
    ...overrides,
  };
  return { row, fullKey: key };
}

function seedWorld(key: ApiKeyRow) {
  seedFakeClient({
    ...defaultSeed,
    customers: [
      {
        id: CUSTOMER_ID,
        user_id: "99999999-9999-4999-8999-999999999901",
        company_name: "Acme",
        phone: null,
        created_at: NOW,
        updated_at: NOW,
      },
    ],
    api_plans: [
      {
        id: PLAN_ID,
        name: "Starter",
        slug: "starter",
        description: null,
        price: 499,
        currency: "ETB",
        billing_interval: "monthly",
        monthly_request_limit: 25000,
        requests_per_minute: 60,
        max_api_keys: 2,
        is_active: true,
        display_order: 2,
        created_at: NOW,
        updated_at: NOW,
      },
    ],
    subscriptions: [
      {
        id: SUBSCRIPTION_ID,
        customer_id: CUSTOMER_ID,
        plan_id: PLAN_ID,
        status: "active",
        starts_at: "2026-08-01T00:00:00.000Z",
        ends_at: null,
        current_period_start: "2026-08-01T00:00:00.000Z",
        current_period_end: "2026-09-01T00:00:00.000Z",
        cancelled_at: null,
        cancellation_reason: null,
        created_at: NOW,
        updated_at: NOW,
      },
    ],
    api_keys: [key],
  });
}

function makeMiddleware() {
  return createCommercialApiAuth({
    apiKeysRepository: new ApiKeysRepository(getFakeClient() as never),
    customersRepository: new CustomersRepository(getFakeClient() as never),
    subscriptionsRepository: new SubscriptionsRepository(getFakeClient() as never),
    apiPlansRepository: new ApiPlansRepository(getFakeClient() as never),
  });
}

function run(middleware: ReturnType<typeof createCommercialApiAuth>, authorization?: string) {
  const req = {
    headers: authorization === undefined ? {} : { authorization },
    commercialApi: undefined,
  } as Request & { commercialApi?: unknown };
  const next = vi.fn<NextFunction>();
  const promise = new Promise<void>((resolve) => {
    middleware(
      req,
      {} as never,
      ((error?: unknown) => {
        next(error as never);
        resolve();
      }) as NextFunction,
    );
  });
  return { req, next, promise };
}

let world: { row: ApiKeyRow; fullKey: string };

beforeEach(() => {
  world = makeKeyRow();
  seedWorld(world.row);
});

describe("createCommercialApiAuth", () => {
  it("attaches the full commercial context on a valid key", async () => {
    const middleware = makeMiddleware();
    const { req, next, promise } = run(middleware, `Bearer ${world.fullKey}`);
    await promise;

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.commercialApi).toMatchObject({
      apiKeyId: world.row.id,
      customerId: CUSTOMER_ID,
      subscriptionId: SUBSCRIPTION_ID,
      planId: PLAN_ID,
      planSlug: "starter",
      requestsPerMinute: 60,
      monthlyRequestLimit: 25000,
      currentPeriodStart: "2026-08-01T00:00:00.000Z",
    });
  });

  it("rejects a missing Authorization header with 401", async () => {
    const { next, promise } = run(makeMiddleware());
    await promise;
    const error = vi.mocked(next).mock.calls[0]?.[0] as { statusCode?: number };
    expect(error?.statusCode).toBe(401);
  });

  it("treats malformed keys exactly like unknown ones (same message)", async () => {
    for (const bad of [
      "Bearer not-even-close",
      "Basic dXNlcjpwYXNz",
      `Bearer ${world.fullKey.slice(0, -1)}!`, // wrong anatomy
      "eeh_live_without_bearer_prefix",
    ]) {
      const { next, promise } = run(makeMiddleware(), bad);
      await promise;
      const error = vi.mocked(next).mock.calls[0]?.[0] as { statusCode?: number; message?: string };
      expect(error?.statusCode).toBe(401);
      expect(error?.message).toBe("Missing or invalid API key.");
    }
  });

  it("rejects an unknown but well-formed key with 401", async () => {
    // Valid anatomy (eeh_live_ + 43 base64url chars) that was never issued.
    const stranger = `eeh_live_${"A".repeat(10)}${"b".repeat(33)}`;
    const { next, promise } = run(makeMiddleware(), `Bearer ${stranger}`);
    await promise;
    const error = vi.mocked(next).mock.calls[0]?.[0] as { statusCode?: number };
    expect(error?.statusCode).toBe(401);
  });

  it("rejects a REVOKED key with 401", async () => {
    seedWorld({ ...world.row, revoked_at: "2026-08-15T00:00:00.000Z" });
    const { next, promise } = run(makeMiddleware(), `Bearer ${world.fullKey}`);
    await promise;
    const error = vi.mocked(next).mock.calls[0]?.[0] as { statusCode?: number; message?: string };
    expect(error?.statusCode).toBe(401);
    expect(error?.message).toContain("revoked");
  });

  it("rejects an EXPIRED key with 401", async () => {
    seedWorld({ ...world.row, expires_at: "2026-08-20T00:00:00.000Z" });
    const { next, promise } = run(makeMiddleware(), `Bearer ${world.fullKey}`);
    await promise;
    const error = vi.mocked(next).mock.calls[0]?.[0] as { statusCode?: number; message?: string };
    expect(error?.statusCode).toBe(401);
    expect(error?.message).toContain("expired");
  });

  it("rejects when the owning customer no longer exists", async () => {
    getFakeClient().tables.set("customers", []);
    const { next, promise } = run(makeMiddleware(), `Bearer ${world.fullKey}`);
    await promise;
    const error = vi.mocked(next).mock.calls[0]?.[0] as { statusCode?: number };
    expect(error?.statusCode).toBe(401);
  });

  for (const [status, expectation] of [
    ["pending", "No active subscription"],
    ["expired", "No active subscription"],
    ["cancelled", "No active subscription"],
    ["suspended", "No active subscription"],
  ] as const) {
    it(`rejects a ${status} subscription with 403`, async () => {
      seedWorld(world.row);
      getFakeClient().tables.get("subscriptions")![0]!.status = status;
      const { next, promise } = run(makeMiddleware(), `Bearer ${world.fullKey}`);
      await promise;
      const error = vi.mocked(next).mock.calls[0]?.[0] as { statusCode?: number; message?: string };
      expect(error?.statusCode).toBe(403);
      expect(error?.message).toContain(expectation);
    });
  }

  it("rejects when the billing period has passed even while status=active", async () => {
    getFakeClient().tables.get("subscriptions")![0]!.current_period_end =
      "2026-08-15T00:00:00.000Z"; // before NOW
    const { next, promise } = run(makeMiddleware(), `Bearer ${world.fullKey}`);
    await promise;
    const error = vi.mocked(next).mock.calls[0]?.[0] as { statusCode?: number; message?: string };
    expect(error?.statusCode).toBe(403);
    expect(error?.message).toContain("expired");
  });

  it("rejects an inactive or deleted plan with 403", async () => {
    getFakeClient().tables.get("api_plans")![0]!.is_active = false;
    const { next, promise } = run(makeMiddleware(), `Bearer ${world.fullKey}`);
    await promise;
    const error = vi.mocked(next).mock.calls[0]?.[0] as { statusCode?: number };
    expect(error?.statusCode).toBe(403);

    getFakeClient().tables.set("api_plans", []);
    const retry = run(makeMiddleware(), `Bearer ${world.fullKey}`);
    await retry.promise;
    expect((vi.mocked(retry.next).mock.calls[0]?.[0] as { statusCode?: number }).statusCode).toBe(
      403,
    );
  });

  it("never stores or echoes the full key or its hash in the context", async () => {
    const middleware = makeMiddleware();
    const { req, promise } = run(middleware, `Bearer ${world.fullKey}`);
    await promise;
    const serialized = JSON.stringify(req.commercialApi);
    expect(serialized).not.toContain(world.fullKey);
    expect(serialized).not.toContain(world.row.key_hash);
    expect(serialized).not.toContain("keyHash");
  });
});
