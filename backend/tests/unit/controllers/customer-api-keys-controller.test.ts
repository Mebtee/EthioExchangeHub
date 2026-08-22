import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { CustomerApiKeysController } from "@/controllers/CustomerApiKeysController";
import { AuthenticationError, NotFoundError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { ApiKeysRepository } from "@/repositories/ApiKeysRepository";
import { ApiPlansRepository } from "@/repositories/ApiPlansRepository";
import { CustomersRepository } from "@/repositories/CustomersRepository";
import { SubscriptionsRepository } from "@/repositories/SubscriptionsRepository";
import { CustomerApiKeysServiceImpl } from "@/services/CustomerApiKeysService";
import type { AuthenticatedUser } from "@/types/auth";
import type { ApiKeyRow, CustomerRow, Database, UserRow } from "@/types/database";

import {
  createMockNext,
  createMockRequest,
  createMockResponse,
  flushPromises,
} from "../../helpers/http";
import { createFakeSupabaseClient } from "../../helpers/supabase-client";

type MockResponse = ReturnType<typeof createMockResponse>;

const USER_ID = "user-1";
const CUSTOMER_ID = "11111111-1111-4111-8111-111111111111";

function makeUser(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: USER_ID,
    email: "customer@example.com",
    name: "Customer",
    role: "customer",
    password_hash: hashPassword("secret"),
    avatar_url: null,
    created_at: "2026-08-01T00:00:00.000Z",
    last_login_at: null,
    ...overrides,
  };
}

function makeCustomer(overrides: Partial<CustomerRow> = {}): CustomerRow {
  return {
    id: CUSTOMER_ID,
    user_id: USER_ID,
    company_name: null,
    phone: null,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeKeyRow(overrides: Partial<ApiKeyRow> = {}): ApiKeyRow {
  return {
    id: "33333333-3333-4333-8333-333333333331",
    customer_id: CUSTOMER_ID,
    name: "Production API",
    key_prefix: "eeh_live_abcd1234",
    key_hash: "a".repeat(64),
    last_used_at: null,
    expires_at: null,
    revoked_at: null,
    created_at: "2026-08-10T10:00:00.000Z",
    updated_at: "2026-08-10T10:00:00.000Z",
    ...overrides,
  };
}

const PLAN_ID = "44444444-4444-4444-8444-444444444444";
const SUBSCRIPTION_ID = "55555555-5555-4555-8555-555555555555";

/** Active plan + subscription so key creation passes the Phase 2C gate. */
const DEFAULT_PLAN_ROW = {
  id: PLAN_ID,
  name: "Free",
  slug: "free",
  description: null,
  price: 0,
  currency: "ETB",
  billing_interval: "monthly",
  monthly_request_limit: 2_000,
  requests_per_minute: 30,
  max_api_keys: 1,
  is_active: true,
  display_order: 1,
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-01T00:00:00.000Z",
};
const DEFAULT_SUBSCRIPTION_ROW = {
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
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-01T00:00:00.000Z",
};

/** Builds the real controller over the real service wired to a seeded client. */
function makeController(
  seedRows: {
    users?: UserRow[];
    apiKeys?: ApiKeyRow[];
    apiPlans?: Record<string, unknown>[];
    subscriptions?: Record<string, unknown>[];
  } = {},
) {
  const client = createFakeSupabaseClient({
    users: seedRows.users ?? [makeUser()],
    customers: [makeCustomer()],
    api_keys: seedRows.apiKeys ?? [],
    api_plans: seedRows.apiPlans ?? [DEFAULT_PLAN_ROW],
    subscriptions: seedRows.subscriptions ?? [DEFAULT_SUBSCRIPTION_ROW],
  });
  const supabase = client as unknown as SupabaseClient<Database>;
  const service = new CustomerApiKeysServiceImpl(
    new CustomersRepository(supabase),
    new ApiKeysRepository(supabase),
    new SubscriptionsRepository(supabase),
    new ApiPlansRepository(supabase),
  );
  return { client, controller: new CustomerApiKeysController(service) };
}

function authedRequest(
  body: unknown,
  user?: AuthenticatedUser,
  params: Record<string, string> = {},
) {
  return createMockRequest({ body: body as never, user, params });
}

async function runCreate(
  controller: CustomerApiKeysController,
  body: unknown,
  user?: AuthenticatedUser,
): Promise<{ res: MockResponse; next: ReturnType<typeof createMockNext> }> {
  const res = createMockResponse();
  const next = createMockNext();
  controller.create(authedRequest(body, user), res, next);
  await flushPromises();
  return { res, next };
}

describe("CustomerApiKeysController.create", () => {
  it("returns a 201 envelope carrying the one-time secret", async () => {
    const { controller } = makeController();
    const { res } = await runCreate(controller, { name: "Production API" }, {
      id: USER_ID,
      role: "customer",
    } as AuthenticatedUser);

    expect(res.status).toHaveBeenCalledWith(201);
    const envelope = res.json.mock.calls[0]![0] as {
      success: boolean;
      message: string;
      data: Record<string, unknown>;
    };
    expect(envelope.success).toBe(true);
    expect(envelope.message).toBe("API key created successfully.");
    expect((envelope.data.key as string).startsWith("eeh_live_")).toBe(true);
    // The stored hash must never appear anywhere in the response.
    expect(JSON.stringify(envelope)).not.toContain("key_hash");
  });

  it("rejects an unauthenticated request (missing req.user) with 401 semantics", async () => {
    const { controller } = makeController();
    const { res, next } = await runCreate(controller, { name: "k" }, undefined);

    expect(res.status).not.toHaveBeenCalled();
    expect(next.mock.calls[0]![0]).toBeInstanceOf(AuthenticationError);
  });
});

describe("CustomerApiKeysController.list", () => {
  it("returns views only — no full key and no hash", async () => {
    const { controller } = makeController({ apiKeys: [makeKeyRow()] });
    const res = createMockResponse();
    const next = createMockNext();
    const req = authedRequest({}, { id: USER_ID, role: "customer" } as AuthenticatedUser);

    controller.list(req, res, next);
    await flushPromises();
    const envelope = res.json.mock.calls[0]![0] as { data: Array<Record<string, unknown>> };
    expect(envelope.data).toHaveLength(1);
    expect(envelope.data[0]).toMatchObject({
      id: makeKeyRow().id,
      keyPrefix: "eeh_live_abcd1234",
    });
    expect(envelope.data[0]).not.toHaveProperty("key");
    expect(JSON.stringify(envelope)).not.toContain("key_hash");
  });

  it("maps a missing customer profile to NotFoundError via next", async () => {
    const client = createFakeSupabaseClient({
      users: [makeUser()],
      customers: [],
      api_keys: [],
    });
    const supabase = client as unknown as SupabaseClient<Database>;
    const controller = new CustomerApiKeysController(
      new CustomerApiKeysServiceImpl(
        new CustomersRepository(supabase),
        new ApiKeysRepository(supabase),
        new SubscriptionsRepository(supabase),
        new ApiPlansRepository(supabase),
      ),
    );
    const res = createMockResponse();
    const next = createMockNext();

    controller.list(
      authedRequest({}, { id: USER_ID, role: "customer" } as AuthenticatedUser),
      res,
      next,
    );
    await flushPromises();

    expect(next.mock.calls[0]![0]).toBeInstanceOf(NotFoundError);
  });
});

describe("CustomerApiKeysController.revoke", () => {
  it("delegates the route param and returns the revocation envelope", async () => {
    const { controller } = makeController({ apiKeys: [makeKeyRow()] });
    const res = createMockResponse();
    const next = createMockNext();
    const req = authedRequest({}, { id: USER_ID, role: "customer" } as AuthenticatedUser, {
      id: makeKeyRow().id,
    });

    controller.revoke(req, res, next);
    await flushPromises();

    const envelope = res.json.mock.calls[0]![0] as {
      message: string;
      data: Record<string, unknown>;
    };
    expect(envelope.message).toBe("API key revoked.");
    expect(envelope.data.revokedAt).not.toBeNull();
    expect(envelope.data).not.toHaveProperty("key");
  });
});
