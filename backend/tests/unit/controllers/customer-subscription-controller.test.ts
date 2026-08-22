import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { CustomerSubscriptionController } from "@/controllers/CustomerSubscriptionController";
import { AuthenticationError, NotFoundError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { ApiPlansRepository } from "@/repositories/ApiPlansRepository";
import { CustomersRepository } from "@/repositories/CustomersRepository";
import { SubscriptionsRepository } from "@/repositories/SubscriptionsRepository";
import { CustomerSubscriptionServiceImpl } from "@/services/CustomerSubscriptionService";
import type { AuthenticatedUser } from "@/types/auth";
import type { CustomerRow, Database, UserRow } from "@/types/database";

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
const FREE_PLAN_ID = "44444444-4444-4444-8444-444444444444";

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

const PLAN_ROWS = [
  {
    id: FREE_PLAN_ID,
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
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    name: "Retired",
    slug: "retired",
    description: null,
    price: 1_499,
    currency: "ETB",
    billing_interval: "monthly",
    monthly_request_limit: 100_000,
    requests_per_minute: 120,
    max_api_keys: 5,
    is_active: false,
    display_order: 2,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
  },
];

/** Real controller over the real service wired to a seeded client. */
function makeController(seedRows: { users?: UserRow[]; customers?: CustomerRow[] } = {}) {
  const client = createFakeSupabaseClient({
    users: seedRows.users ?? [makeUser()],
    customers: seedRows.customers ?? [makeCustomer()],
    api_plans: PLAN_ROWS,
    subscriptions: [],
  });
  const supabase = client as unknown as SupabaseClient<Database>;
  const service = new CustomerSubscriptionServiceImpl(
    new CustomersRepository(supabase),
    new SubscriptionsRepository(supabase),
    new ApiPlansRepository(supabase),
  );
  return { client, controller: new CustomerSubscriptionController(service) };
}

const AUTH: AuthenticatedUser = { id: USER_ID, role: "customer" } as AuthenticatedUser;

async function run(
  action: (
    req: ReturnType<typeof createMockRequest>,
    res: MockResponse,
    next: ReturnType<typeof createMockNext>,
  ) => void,
  options: { body?: unknown; user?: AuthenticatedUser; params?: Record<string, string> } = {},
) {
  const res = createMockResponse();
  const next = createMockNext();
  const req = createMockRequest({
    body: (options.body ?? {}) as never,
    user: options.user,
    params: options.params ?? {},
  });
  action(req, res, next);
  await flushPromises();
  return { res, next };
}

describe("CustomerSubscriptionController.getPlans", () => {
  it("returns a 200 envelope with active plans only", async () => {
    const { controller } = makeController();

    const { res, next } = await run(controller.getPlans);

    expect(next).not.toHaveBeenCalledWith(expect.anything());
    expect(res.status).toHaveBeenCalledWith(200);
    const envelope = res.json.mock.calls[0]![0] as {
      message: string;
      data: Array<Record<string, unknown>>;
    };
    expect(envelope.message).toBe("Plans retrieved.");
    expect(envelope.data).toHaveLength(1); // inactive plan hidden
    expect(envelope.data[0]).toMatchObject({ name: "Free", billingInterval: "monthly" });
    expect(envelope.data[0]).not.toHaveProperty("is_active");
  });
});

describe("CustomerSubscriptionController.getSubscription", () => {
  it("maps a missing subscription to NotFoundError via next", async () => {
    const { controller } = makeController();

    const { res, next } = await run(controller.getSubscription, { user: AUTH });

    expect(res.status).not.toHaveBeenCalled();
    expect(next.mock.calls[0]![0]).toBeInstanceOf(NotFoundError);
  });

  it("returns a 200 envelope after a plan was selected", async () => {
    const { controller, client } = makeController();
    await run(controller.createSubscription, { user: AUTH, body: { plan_id: FREE_PLAN_ID } });

    const { res, next } = await run(controller.getSubscription, { user: AUTH });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    const envelope = res.json.mock.calls[0]![0] as {
      message: string;
      data: Record<string, unknown>;
    };
    expect(envelope.message).toBe("Subscription retrieved.");
    expect(envelope.data).toMatchObject({ planId: FREE_PLAN_ID, status: "active" });
    // Exactly one row exists — reads never create records.
    expect(client.tables.get("subscriptions")).toHaveLength(1);
  });
});

describe("CustomerSubscriptionController.createSubscription", () => {
  it("returns a 201 envelope for a valid free-plan selection", async () => {
    const { controller } = makeController();

    const { res, next } = await run(controller.createSubscription, {
      user: AUTH,
      body: { plan_id: FREE_PLAN_ID },
    });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    const envelope = res.json.mock.calls[0]![0] as {
      message: string;
      data: Record<string, unknown>;
    };
    expect(envelope.message).toBe("Subscription created.");
    expect(envelope.data).toMatchObject({ status: "active" });
  });

  it("rejects an unauthenticated request (missing req.user) with 401 semantics", async () => {
    const { controller } = makeController();

    const { res, next } = await run(controller.createSubscription, {
      body: { plan_id: FREE_PLAN_ID },
    });

    expect(res.status).not.toHaveBeenCalled();
    expect(next.mock.calls[0]![0]).toBeInstanceOf(AuthenticationError);
  });
});
