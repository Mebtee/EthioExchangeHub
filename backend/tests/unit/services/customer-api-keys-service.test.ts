import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createHash } from "node:crypto";

import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { hashApiKey } from "@/lib/api-keys";
import { logger } from "@/lib/logger";
import { ApiKeysRepository } from "@/repositories/ApiKeysRepository";
import { ApiPlansRepository } from "@/repositories/ApiPlansRepository";
import { CustomersRepository } from "@/repositories/CustomersRepository";
import { SubscriptionsRepository } from "@/repositories/SubscriptionsRepository";
import { CustomerApiKeysServiceImpl } from "@/services/CustomerApiKeysService";
import type {
  ApiKeyRow,
  ApiPlanRow,
  CustomerRow,
  Database,
  SubscriptionRow,
} from "@/types/database";

import { createFakeSupabaseClient } from "../../helpers/supabase-client";

const CUSTOMER_A_USER = "user-a";
const CUSTOMER_B_USER = "user-b";
const CUSTOMER_A = "11111111-1111-4111-8111-111111111111";
const CUSTOMER_B = "22222222-2222-4222-8222-222222222222";

function makeCustomer(overrides: Partial<CustomerRow> = {}): CustomerRow {
  return {
    id: CUSTOMER_A,
    user_id: CUSTOMER_A_USER,
    company_name: "Example Company",
    phone: null,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeKeyRow(overrides: Partial<ApiKeyRow> = {}): ApiKeyRow {
  return {
    id: "33333333-3333-4333-8333-333333333331",
    customer_id: CUSTOMER_A,
    name: "Production API",
    key_prefix: "eeh_live_abcd1234",
    key_hash: hashApiKey("eeh_live_seededsecret"),
    last_used_at: null,
    expires_at: null,
    revoked_at: null,
    created_at: "2026-08-10T10:00:00.000Z",
    updated_at: "2026-08-10T10:00:00.000Z",
    ...overrides,
  };
}

function makePlan(overrides: Partial<ApiPlanRow> = {}): ApiPlanRow {
  return {
    id: "44444444-4444-4444-8444-444444444444",
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
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeSubscription(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    customer_id: CUSTOMER_A,
    plan_id: makePlan().id,
    status: "active",
    starts_at: "2026-08-01T00:00:00.000Z",
    ends_at: null,
    current_period_start: "2026-08-01T00:00:00.000Z",
    current_period_end: "2026-09-01T00:00:00.000Z",
    cancelled_at: null,
    cancellation_reason: null,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

interface SeedOptions {
  customers?: CustomerRow[];
  apiKeys?: ApiKeyRow[];
  plans?: ApiPlanRow[];
  subscriptions?: SubscriptionRow[];
}

/** Real service wired to real repositories over one seeded in-memory client. */
function makeService(seed: SeedOptions = {}) {
  const client = createFakeSupabaseClient({
    users: [],
    customers: seed.customers ?? [
      makeCustomer(),
      makeCustomer({ id: CUSTOMER_B, user_id: CUSTOMER_B_USER }),
    ],
    api_keys: seed.apiKeys ?? [],
    api_plans: seed.plans ?? [],
    subscriptions: seed.subscriptions ?? [],
  });
  const service = new CustomerApiKeysServiceImpl(
    new CustomersRepository(client as unknown as SupabaseClient<Database>),
    new ApiKeysRepository(client as unknown as SupabaseClient<Database>),
    new SubscriptionsRepository(client as unknown as SupabaseClient<Database>),
    new ApiPlansRepository(client as unknown as SupabaseClient<Database>),
  );
  return { service, client };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("CustomerApiKeysServiceImpl.createKey", () => {
  it("creates a key and returns the full secret exactly once", async () => {
    const { service, client } = makeService();
    const future = "2027-08-21T00:00:00.000Z";

    const created = await service.createKey(CUSTOMER_A_USER, {
      name: "Production API",
      expiresAt: future,
    });

    expect(created.key).toMatch(/^eeh_live_/);
    expect(created.name).toBe("Production API");
    expect(created.expiresAt).toBe(future);
    expect(created.revokedAt).toBeNull();

    // Exactly ONE row was written for THIS customer.
    const rows = client.tables.get("api_keys")!;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ customer_id: CUSTOMER_A, name: "Production API" });
  });

  it("generates keys with the expected eeh_live_ prefix shape", async () => {
    const { service } = makeService();
    const created = await service.createKey(CUSTOMER_A_USER, { name: "k" });

    // Scheme + 8 public chars; the prefix is a prefix of the full secret.
    expect(created.keyPrefix).toMatch(/^eeh_live_[A-Za-z0-9_-]{8}$/);
    expect(created.key.startsWith(created.keyPrefix)).toBe(true);
    // The remaining secret stays long enough to resist guessing.
    expect(created.key.length - created.keyPrefix.length).toBeGreaterThanOrEqual(30);
  });

  it("produces distinct secrets across creations (no reuse)", async () => {
    const { service } = makeService();
    const first = await service.createKey(CUSTOMER_A_USER, { name: "one" });
    const second = await service.createKey(CUSTOMER_A_USER, { name: "two" });
    expect(first.key).not.toBe(second.key);
    expect(first.keyPrefix).not.toBe(second.keyPrefix);
  });

  it("stores only key_prefix + SHA-256 hash — never the plaintext", async () => {
    const { service, client } = makeService();
    const created = await service.createKey(CUSTOMER_A_USER, { name: "k" });

    const row = client.tables.get("api_keys")![0]!;
    expect(row.key_hash).toBe(createHash("sha256").update(created.key, "utf8").digest("hex"));
    expect(JSON.stringify(row)).not.toContain(created.key);
    expect(Object.keys(row)).not.toContain("key");
  });

  it("rejects a past expires_at with ValidationError", async () => {
    const { service, client } = makeService();
    await expect(
      service.createKey(CUSTOMER_A_USER, { name: "k", expiresAt: "2020-01-01T00:00:00.000Z" }),
    ).rejects.toBeInstanceOf(ValidationError);
    // Nothing was written.
    expect(client.tables.get("api_keys")).toHaveLength(0);
  });

  it("rejects creation when the caller has no customer profile", async () => {
    const { service } = makeService();
    await expect(service.createKey("user-nobody", { name: "k" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("enforces max_api_keys of the active plan (409 at the cap)", async () => {
    const plan = makePlan({ max_api_keys: 1 });
    const subscription = makeSubscription({ plan_id: plan.id });
    const { service } = makeService({
      plans: [plan],
      subscriptions: [subscription],
    });

    await service.createKey(CUSTOMER_A_USER, { name: "first" });
    await expect(service.createKey(CUSTOMER_A_USER, { name: "second" })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("frees plan slots after revocation (only non-revoked keys count)", async () => {
    const plan = makePlan({ max_api_keys: 1 });
    const { service, client } = makeService({
      plans: [plan],
      subscriptions: [makeSubscription({ plan_id: plan.id })],
      apiKeys: [
        makeKeyRow({
          revoked_at: "2026-08-11T00:00:00.000Z",
          key_hash: hashApiKey("eeh_live_old"),
        }),
      ],
    });

    const created = await service.createKey(CUSTOMER_A_USER, { name: "fresh" });
    expect(created.key).toMatch(/^eeh_live_/);
    expect(client.tables.get("api_keys")).toHaveLength(2);
  });

  it("allows unlimited keys while no active subscription exists (deferred to the subscription phase)", async () => {
    const { service } = makeService();
    for (let index = 0; index < 3; index += 1) {
      await expect(
        service.createKey(CUSTOMER_A_USER, { name: `key-${index}` }),
      ).resolves.toMatchObject({ name: `key-${index}` });
    }
  });

  it("ignores non-active subscriptions for the plan limit", async () => {
    const plan = makePlan({ max_api_keys: 0 }); // would block if consulted
    const { service } = makeService({
      plans: [plan],
      subscriptions: [makeSubscription({ plan_id: plan.id, status: "pending" })],
    });

    await expect(service.createKey(CUSTOMER_A_USER, { name: "k" })).resolves.toBeDefined();
  });
});

describe("CustomerApiKeysServiceImpl.listKeys", () => {
  it("lists only the caller's keys, newest first, without secrets", async () => {
    const { service, client } = makeService({
      apiKeys: [
        makeKeyRow(),
        makeKeyRow({
          id: "33333333-3333-4333-8333-333333333332",
          created_at: "2026-08-12T10:00:00.000Z",
          key_hash: hashApiKey("eeh_live_other"),
        }),
        // Another customer's key must never leak.
        makeKeyRow({
          id: "33333333-3333-4333-8333-333333333333",
          customer_id: CUSTOMER_B,
          key_hash: hashApiKey("eeh_live_foreign"),
        }),
      ],
    });

    const views = await service.listKeys(CUSTOMER_A_USER);

    expect(views).toHaveLength(2);
    expect(views[0]!.createdAt).toBe("2026-08-12T10:00:00.000Z");
    for (const view of views) {
      expect(view).not.toHaveProperty("key");
      expect(view).not.toHaveProperty("keyHash");
      expect(JSON.stringify(view)).not.toContain("key_hash");
    }
    // The stored hashes stay untouched in the database.
    expect(client.tables.get("api_keys")!.every((row) => row.key_hash.length === 64)).toBe(true);
  });

  it("keeps revoked and expired keys visible with their status fields", async () => {
    const { service } = makeService({
      apiKeys: [
        makeKeyRow({
          revoked_at: "2026-08-11T00:00:00.000Z",
          expires_at: "2026-08-05T00:00:00.000Z",
          key_hash: hashApiKey("eeh_live_dead"),
        }),
      ],
    });

    const [view] = await service.listKeys(CUSTOMER_A_USER);
    expect(view!.revokedAt).toBe("2026-08-11T00:00:00.000Z");
    expect(view!.expiresAt).toBe("2026-08-05T00:00:00.000Z");
  });
});

describe("CustomerApiKeysServiceImpl.revokeKey", () => {
  it("stamps revoked_at + updated_at on an owned active key", async () => {
    const { service, client } = makeService({ apiKeys: [makeKeyRow()] });

    const view = await service.revokeKey(CUSTOMER_A_USER, makeKeyRow().id);

    expect(view.revokedAt).not.toBeNull();
    const row = client.tables.get("api_keys")![0]!;
    expect(row.revoked_at).toBe(view.revokedAt);
    expect(row.updated_at).toBe(view.updatedAt);
    // Revocation is not deletion.
    expect(client.tables.get("api_keys")).toHaveLength(1);
  });

  it("answers 404 for another customer's key (isolation)", async () => {
    const { service, client } = makeService({
      apiKeys: [makeKeyRow({ customer_id: CUSTOMER_B })],
    });

    await expect(service.revokeKey(CUSTOMER_A_USER, makeKeyRow().id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(client.tables.get("api_keys")![0]!.revoked_at).toBeNull();
  });

  it("is idempotent — re-revoking keeps the original stamp", async () => {
    const originalStamp = "2026-08-11T00:00:00.000Z";
    const { service } = makeService({
      apiKeys: [makeKeyRow({ revoked_at: originalStamp })],
    });

    const view = await service.revokeKey(CUSTOMER_A_USER, makeKeyRow().id);
    expect(view.revokedAt).toBe(originalStamp);
  });
});

describe("CustomerApiKeysServiceImpl log hygiene", () => {
  it("never writes the full key (or its hash) to logs", async () => {
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => undefined);
    const { service } = makeService({ apiKeys: [makeKeyRow()] });

    const created = await service.createKey(CUSTOMER_A_USER, { name: "k" });
    await service.listKeys(CUSTOMER_A_USER);
    await service.revokeKey(CUSTOMER_A_USER, makeKeyRow().id);

    const logged = JSON.stringify([...infoSpy.mock.calls, ...errorSpy.mock.calls]);
    expect(logged).not.toContain(created.key);
    expect(logged).not.toContain(hashApiKey(created.key));
    // Log calls reference the key by id only.
    expect(infoSpy.mock.calls.some((call) => JSON.stringify(call).includes(created.id))).toBe(true);
  });
});
