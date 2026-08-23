import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConflictError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { ApiPlansRepository } from "@/repositories/ApiPlansRepository";
import { CustomersRepository } from "@/repositories/CustomersRepository";
import { SubscriptionsRepository } from "@/repositories/SubscriptionsRepository";
import {
  CustomerSubscriptionServiceImpl,
  type PlanView,
} from "@/services/CustomerSubscriptionService";
import type { ApiPlanRow, CustomerRow, Database, SubscriptionRow } from "@/types/database";
import { nowIso } from "@/utils/date";

import { createFakeSupabaseClient } from "../../helpers/supabase-client";

// ---- Deterministic clock -----------------------------------------------------
const NOW = new Date("2026-08-21T12:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.spyOn(logger, "info").mockImplementation(() => undefined);
});

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
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...overrides,
  };
}

let planSeq = 0;
function makePlan(overrides: Partial<ApiPlanRow> = {}): ApiPlanRow {
  planSeq += 1;
  const id = `aaaaaaaa-aaaa-4aaa-8aaa-${String(planSeq).padStart(12, "0")}`;
  return {
    id,
    name: `Plan ${planSeq}`,
    slug: `plan-${planSeq}`,
    description: null,
    price: 0,
    currency: "ETB",
    billing_interval: "monthly",
    monthly_request_limit: 2_000,
    requests_per_minute: 30,
    max_api_keys: 1,
    is_active: true,
    display_order: planSeq,
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...overrides,
  };
}

let subSeq = 0;
function makeSubscription(overrides: Partial<SubscriptionRow> = {}): SubscriptionRow {
  subSeq += 1;
  const id = `bbbbbbbb-bbbb-4bbb-8bbb-${String(subSeq).padStart(12, "0")}`;
  return {
    id,
    customer_id: CUSTOMER_A,
    plan_id: makePlan().id,
    status: "active",
    starts_at: null,
    ends_at: null,
    current_period_start: null,
    current_period_end: null,
    cancelled_at: null,
    cancellation_reason: null,
    created_at: NOW.toISOString(),
    updated_at: NOW.toISOString(),
    ...overrides,
  };
}

interface SeedOptions {
  customers?: CustomerRow[];
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
    api_plans: seed.plans ?? [],
    subscriptions: seed.subscriptions ?? [],
  });
  const service = new CustomerSubscriptionServiceImpl(
    new CustomersRepository(client as unknown as SupabaseClient<Database>),
    new SubscriptionsRepository(client as unknown as SupabaseClient<Database>),
    new ApiPlansRepository(client as unknown as SupabaseClient<Database>),
  );
  return { service, client };
}

// ---------------------------------------------------------------------------
describe("CustomerSubscriptionServiceImpl.getPlans", () => {
  it("returns active plans in display_order", async () => {
    const free = makePlan({ name: "Free", price: 0, display_order: 1 });
    const business = makePlan({ name: "Business", price: 2500, display_order: 3 });
    const starter = makePlan({ name: "Starter", price: 900, display_order: 2 });
    const { service } = makeService({ plans: [free, business, starter] });

    const plans = await service.getPlans();

    expect(plans.map((plan) => plan.name)).toEqual(["Free", "Starter", "Business"]);
  });

  it("excludes inactive plans", async () => {
    const visible = makePlan({ name: "Visible" });
    const { service } = makeService({
      plans: [visible, makePlan({ is_active: false, name: "Hidden" })],
    });

    const plans = await service.getPlans();

    expect(plans.map((plan: PlanView) => plan.name)).toEqual(["Visible"]);
  });

  it("maps rows into camelCase views without internal fields", async () => {
    const { service } = makeService({ plans: [makePlan({ price: 499 })] });

    const [view] = await service.getPlans();

    expect(view).toEqual<PlanView>({
      id: expect.any(String),
      name: expect.any(String),
      slug: expect.any(String),
      description: null,
      price: 499,
      currency: "ETB",
      billingInterval: "monthly",
      monthlyRequestLimit: 2_000,
      requestsPerMinute: 30,
      maxApiKeys: 1,
      displayOrder: expect.any(Number),
    });
    expect(Object.keys(view!)).not.toContain("isActive");
    expect(JSON.stringify(view)).not.toContain("created_at");
  });
});

describe("CustomerSubscriptionServiceImpl.getSubscription", () => {
  it("answers NotFoundError when the customer has no subscription", async () => {
    const { service, client } = makeService();

    await expect(service.getSubscription(CUSTOMER_A_USER)).rejects.toBeInstanceOf(NotFoundError);
    // No record was invented.
    expect(client.tables.get("subscriptions")).toHaveLength(0);
  });

  it("returns the latest subscription when several exist", async () => {
    const older = makeSubscription({
      status: "expired",
      created_at: "2026-07-01T00:00:00.000Z",
    });
    const latest = makeSubscription({ status: "active", created_at: "2026-08-01T00:00:00.000Z" });
    const { service } = makeService({ subscriptions: [older, latest] });

    const view = await service.getSubscription(CUSTOMER_A_USER);

    expect(view.id).toBe(latest.id);
    expect(view.status).toBe("active");
  });

  it("prefers the ACTIVE subscription over a newer PENDING upgrade", async () => {
    // While an upgrade awaits payment approval the customer's effective plan
    // is still the ACTIVE one (it governs limits and billing).
    const activeFree = makeSubscription({
      status: "active",
      created_at: "2026-07-01T00:00:00.000Z",
    });
    const pendingUpgrade = makeSubscription({
      status: "pending",
      created_at: "2026-08-01T00:00:00.000Z",
    });
    const { service } = makeService({ subscriptions: [activeFree, pendingUpgrade] });

    const view = await service.getSubscription(CUSTOMER_A_USER);

    expect(view.id).toBe(activeFree.id);
    expect(view.status).toBe("active");
  });

  it("never exposes another customer's subscription", async () => {
    const foreign = makeSubscription({ customer_id: CUSTOMER_B });
    const { service } = makeService({ subscriptions: [foreign] });

    await expect(service.getSubscription(CUSTOMER_A_USER)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("CustomerSubscriptionServiceImpl.createSubscription", () => {
  it("activates FREE plans immediately with the first period stamped", async () => {
    const free = makePlan({ price: 0 });
    const { service, client } = makeService({ plans: [free] });

    const view = await service.createSubscription(CUSTOMER_A_USER, { planId: free.id });

    expect(view.status).toBe("active");
    expect(view.startsAt).toBe(NOW.toISOString());
    expect(view.endsAt).toBeNull();
    expect(view.currentPeriodStart).toBe(NOW.toISOString());
    // Exactly one month ahead of the same `now` instant.
    expect(new Date(view.currentPeriodEnd!).getTime()).toBe(
      new Date(NOW).setUTCMonth(NOW.getUTCMonth() + 1),
    );

    const row = client.tables.get("subscriptions")![0]!;
    expect(row.customer_id).toBe(CUSTOMER_A);
    expect(row.plan_id).toBe(free.id);
    expect(row.cancelled_at).toBeNull();
  });

  it("creates PAID selections as pending with NO period fields", async () => {
    const starter = makePlan({ name: "Starter", price: 900 });
    const { service, client } = makeService({ plans: [starter] });

    const view = await service.createSubscription(CUSTOMER_A_USER, { planId: starter.id });

    expect(view.status).toBe("pending");
    expect(view.startsAt).toBeNull();
    expect(view.endsAt).toBeNull();
    expect(view.currentPeriodStart).toBeNull();
    expect(view.currentPeriodEnd).toBeNull();
    expect(client.tables.get("subscriptions")).toHaveLength(1);
    expect(client.tables.get("subscriptions")![0]!.created_at).toBe(nowIso());
  });

  it("answers NotFoundError for an unknown plan_id and writes nothing", async () => {
    const { service, client } = makeService();

    await expect(
      service.createSubscription(CUSTOMER_A_USER, {
        planId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(client.tables.get("subscriptions")).toHaveLength(0);
  });

  it("answers ConflictError for an INACTIVE plan", async () => {
    const retired = makePlan({ is_active: false });
    const { service, client } = makeService({ plans: [retired] });

    await expect(
      service.createSubscription(CUSTOMER_A_USER, { planId: retired.id }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(client.tables.get("subscriptions")).toHaveLength(0);
  });

  // ---- Upgrade rules (price-based tiering) -----------------------------------

  it("allows an upgrade from an ACTIVE plan to a strictly pricier one", async () => {
    const free = makePlan({ name: "Free", price: 0 });
    const starter = makePlan({ name: "Starter", price: 499 });
    const activeFree = makeSubscription({ plan_id: free.id, status: "active" });
    const { service, client } = makeService({
      plans: [free, starter],
      subscriptions: [activeFree],
    });

    const view = await service.createSubscription(CUSTOMER_A_USER, { planId: starter.id });

    // The upgrade is a PAID selection → pending until the transfer is verified.
    expect(view.status).toBe("pending");
    const rows = client.tables.get("subscriptions")!;
    expect(rows).toHaveLength(2); // INSERT — the active Free row is untouched
    expect(rows[0]).toEqual(activeFree);
    expect(rows[1]!.plan_id).toBe(starter.id);
    expect(rows[1]!.customer_id).toBe(CUSTOMER_A);
  });

  it("allows multi-step upgrades (Starter → Business) while Starter is active", async () => {
    const starter = makePlan({ name: "Starter", price: 499 });
    const business = makePlan({ name: "Business", price: 1499 });
    const activeStarter = makeSubscription({ plan_id: starter.id, status: "active" });
    const { service } = makeService({
      plans: [starter, business],
      subscriptions: [activeStarter],
    });

    const view = await service.createSubscription(CUSTOMER_A_USER, { planId: business.id });
    expect(view.status).toBe("pending");
  });

  it("refuses SAME-PLAN re-selection while that plan is active", async () => {
    const starter = makePlan({ name: "Starter", price: 499 });
    const { service, client } = makeService({
      plans: [starter],
      subscriptions: [makeSubscription({ plan_id: starter.id, status: "active" })],
    });

    await expect(
      service.createSubscription(CUSTOMER_A_USER, { planId: starter.id }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(client.tables.get("subscriptions")).toHaveLength(1);
  });

  it("refuses DOWNGRADES (and equal-priced lateral switches) with 409", async () => {
    const business = makePlan({ name: "Business", price: 1499 });
    const starter = makePlan({ name: "Starter", price: 499 });
    const cheap = makePlan({ name: "Cheap", price: 499 });
    const { service, client } = makeService({
      plans: [business, starter, cheap],
      subscriptions: [makeSubscription({ plan_id: business.id, status: "active" })],
    });

    for (const target of [starter, cheap]) {
      await expect(
        service.createSubscription(CUSTOMER_A_USER, { planId: target.id }),
      ).rejects.toBeInstanceOf(ConflictError);
    }
    expect(client.tables.get("subscriptions")).toHaveLength(1);
  });

  it("refuses a SECOND pending upgrade while one already awaits payment", async () => {
    const free = makePlan({ name: "Free", price: 0 });
    const starter = makePlan({ name: "Starter", price: 499 });
    const business = makePlan({ name: "Business", price: 1499 });
    const { service, client } = makeService({
      plans: [free, starter, business],
      subscriptions: [
        makeSubscription({ plan_id: free.id, status: "active" }),
        makeSubscription({ plan_id: starter.id, status: "pending" }),
      ],
    });

    await expect(
      service.createSubscription(CUSTOMER_A_USER, { planId: business.id }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(client.tables.get("subscriptions")).toHaveLength(2);
  });

  it("still refuses any selection while SUSPENDED", async () => {
    const starter = makePlan({ name: "Starter", price: 499 });
    const { service, client } = makeService({
      plans: [starter],
      subscriptions: [makeSubscription({ status: "suspended" })],
    });

    await expect(
      service.createSubscription(CUSTOMER_A_USER, { planId: starter.id }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(client.tables.get("subscriptions")).toHaveLength(1);
  });

  it("still refuses a second PENDING selection when nothing is active yet", async () => {
    const starter = makePlan({ name: "Starter", price: 499 });
    const { service, client } = makeService({
      plans: [starter],
      subscriptions: [makeSubscription({ plan_id: starter.id, status: "pending" })],
    });

    await expect(
      service.createSubscription(CUSTOMER_A_USER, { planId: starter.id }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(client.tables.get("subscriptions")).toHaveLength(1);
  });

  it("prices upgrades against the CURRENT plan even if it was retired from the catalog", async () => {
    // A deactivated plan keeps governing existing subscribers' tier.
    const retiredStarter = makePlan({ name: "Old Starter", price: 499, is_active: false });
    const business = makePlan({ name: "Business", price: 1499 });
    const { service } = makeService({
      plans: [retiredStarter, business],
      subscriptions: [makeSubscription({ plan_id: retiredStarter.id, status: "active" })],
    });

    const view = await service.createSubscription(CUSTOMER_A_USER, { planId: business.id });
    expect(view.status).toBe("pending");
  });

  it("allows re-selection after EXPIRED or CANCELLED — history preserved via INSERT", async () => {
    const starter = makePlan({ name: "Starter", price: 900 });
    const expired = makeSubscription({ plan_id: starter.id, status: "expired" });
    const cancelled = makeSubscription({ plan_id: starter.id, status: "cancelled" });
    const { service, client } = makeService({
      plans: [starter],
      subscriptions: [expired, cancelled],
    });

    const view = await service.createSubscription(CUSTOMER_A_USER, { planId: starter.id });

    const rows = client.tables.get("subscriptions")!;
    expect(rows).toHaveLength(3); // insert, never update
    expect(rows[2]!.id).toBe(view.id);
    expect(rows[2]!.status).toBe("pending");
    // The terminal rows are untouched.
    expect(rows[0]).toEqual(expired);
    expect(rows[1]).toEqual(cancelled);
  });

  it("creates the subscription for the JWT customer only (isolation)", async () => {
    const free = makePlan({ price: 0 });
    const { service, client } = makeService({ plans: [free] });

    await service.createSubscription(CUSTOMER_A_USER, { planId: free.id });

    const row = client.tables.get("subscriptions")![0]!;
    expect(row.customer_id).toBe(CUSTOMER_A);
    expect(row.customer_id).not.toBe(CUSTOMER_B);
  });

  it("answers NotFoundError for a user without a customer profile", async () => {
    const free = makePlan({ price: 0 });
    const { service } = makeService({ plans: [free], customers: [] });

    await expect(
      service.createSubscription(CUSTOMER_A_USER, { planId: free.id }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
