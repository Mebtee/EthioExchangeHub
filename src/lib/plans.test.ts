import { describe, expect, it } from "vitest";

import { planSelectionState } from "@/lib/plans";
import type { CustomerPlan } from "@/types/customer";

const FREE: CustomerPlan = {
  id: "plan-free",
  name: "Free",
  slug: "free",
  description: null,
  price: 0,
  currency: "ETB",
  billingInterval: "monthly",
  monthlyRequestLimit: 2000,
  requestsPerMinute: 30,
  maxApiKeys: 1,
  displayOrder: 1,
};

const STARTER: CustomerPlan = { ...FREE, id: "plan-starter", name: "Starter", price: 499 };
const BUSINESS: CustomerPlan = {
  ...FREE,
  id: "plan-business",
  name: "Business",
  price: 1499,
};
const CATALOG = [FREE, STARTER, BUSINESS];

function sub(planId: string, status: string) {
  return { planId, status };
}

describe("planSelectionState", () => {
  it("opens every plan when the customer has no subscription", () => {
    for (const plan of CATALOG) {
      expect(planSelectionState(null, CATALOG, plan.id)).toEqual({
        selectable: true,
        block: null,
      });
    }
  });

  it("blocks everything while a subscription is pending or suspended", () => {
    for (const status of ["pending", "suspended"]) {
      expect(planSelectionState(sub(STARTER.id, status), CATALOG, FREE.id)).toEqual({
        selectable: false,
        block: "blocked",
      });
    }
  });

  it("blocks everything while an upgrade is pending behind the ACTIVE plan", () => {
    const activeWithPendingUpgrade = {
      ...sub(FREE.id, "active"),
      pendingUpgrade: sub(STARTER.id, "pending"),
    };
    for (const plan of CATALOG) {
      expect(planSelectionState(activeWithPendingUpgrade, CATALOG, plan.id)).toEqual({
        selectable: false,
        block: "blocked",
      });
    }
  });

  it("allows strictly pricier UPGRADES from the active plan", () => {
    expect(planSelectionState(sub(FREE.id, "active"), CATALOG, STARTER.id)).toEqual({
      selectable: true,
      block: null,
    });
    expect(planSelectionState(sub(STARTER.id, "active"), CATALOG, BUSINESS.id)).toEqual({
      selectable: true,
      block: null,
    });
  });

  it("marks the active plan as current and refuses same-plan selection", () => {
    expect(planSelectionState(sub(FREE.id, "active"), CATALOG, FREE.id)).toEqual({
      selectable: false,
      block: "current",
    });
  });

  it("refuses downgrades AND equal-priced lateral switches from the active plan", () => {
    expect(planSelectionState(sub(BUSINESS.id, "active"), CATALOG, FREE.id)).toEqual({
      selectable: false,
      block: "downgrade",
    });
    const twin = { ...STARTER, id: "plan-twin", name: "Twin" };
    expect(planSelectionState(sub(STARTER.id, "active"), [...CATALOG, twin], twin.id)).toEqual({
      selectable: false,
      block: "downgrade",
    });
  });

  it("reopens every plan once the subscription is terminal", () => {
    for (const status of ["expired", "cancelled"]) {
      expect(planSelectionState(sub(BUSINESS.id, status), CATALOG, FREE.id)).toEqual({
        selectable: true,
        block: null,
      });
    }
  });

  it("is conservative when the active plan is missing from the catalog", () => {
    expect(planSelectionState(sub("plan-gone", "active"), CATALOG, STARTER.id)).toEqual({
      selectable: false,
      block: "blocked",
    });
  });
});
