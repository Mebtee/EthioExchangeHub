import type { CustomerPlan, CustomerSubscription } from "@/types/customer";

/**
 * Why a plan's select button is disabled (mirrors the backend rules in
 * `CustomerSubscriptionService`).
 */
export type PlanSelectionBlock = "current" | "downgrade" | "blocked";

export interface PlanSelectionState {
  /** True when the customer may select this plan right now. */
  selectable: boolean;
  /** Set when the button is disabled; "current" also marks the active plan. */
  block: PlanSelectionBlock | null;
}

/**
 * Mirrors the backend plan-selection rules: a pending or suspended
 * subscription blocks selection entirely, an ACTIVE subscription allows only
 * strictly higher-priced plans (upgrades), and terminal subscriptions leave
 * every plan open again.
 *
 * The catalog is the single source of truth for tier order — prices are
 * compared server-side too, so this is a UX mirror, not the enforcement.
 */
export function planSelectionState(
  subscription: Pick<CustomerSubscription, "planId" | "status"> | null,
  plans: CustomerPlan[],
  planId: string,
): PlanSelectionState {
  if (!subscription) return { selectable: true, block: null };
  if (subscription.status === "pending" || subscription.status === "suspended") {
    return { selectable: false, block: "blocked" };
  }
  if (subscription.status !== "active") return { selectable: true, block: null };
  const currentPlan = plans.find((plan) => plan.id === subscription.planId);
  if (!currentPlan) return { selectable: false, block: "blocked" };
  if (planId === subscription.planId) return { selectable: false, block: "current" };
  const target = plans.find((plan) => plan.id === planId);
  if (!target || target.price <= currentPlan.price) {
    return { selectable: false, block: "downgrade" };
  }
  return { selectable: true, block: null };
}
