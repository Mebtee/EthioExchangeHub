import { describe, expect, it } from "vitest";

import { createSubscriptionBodySchema } from "@/validators/customer-subscription";

const VALID = { plan_id: "11111111-1111-4111-8111-111111111111" };

describe("createSubscriptionBodySchema", () => {
  it("accepts plan_id only", () => {
    const parsed = createSubscriptionBodySchema.safeParse(VALID);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.plan_id).toBe(VALID.plan_id);
  });

  it("rejects a missing plan_id", () => {
    expect(createSubscriptionBodySchema.safeParse({}).success).toBe(false);
    expect(createSubscriptionBodySchema.safeParse({ plan_id: "" }).success).toBe(false);
  });

  it("rejects a non-string or non-UUID plan_id", () => {
    for (const bad of [42, true, "free-plan"]) {
      expect(createSubscriptionBodySchema.safeParse({ plan_id: bad }).success).toBe(false);
    }
  });

  it("rejects mass-assignment attempts on backend-controlled fields", () => {
    const result = createSubscriptionBodySchema.safeParse({
      ...VALID,
      status: "active",
      price: 0,
      currency: "ETB",
      starts_at: "2026-01-01T00:00:00.000Z",
      current_period_end: "2030-01-01T00:00:00.000Z",
      customer_id: "22222222-2222-4222-8222-222222222222",
    });
    expect(result.success).toBe(false);
  });
});
