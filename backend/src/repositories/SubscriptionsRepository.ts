import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";
import type { Database, SubscriptionRow } from "@/types/database";
import { BaseRepository } from "./BaseRepository";

/**
 * `subscriptions` repository (Phase 2B/2C).
 *
 * Phase 2B reads the latest ACTIVE subscription for API-key limits; Phase 2C
 * adds latest-overall lookup and row creation for the customer
 * plan-selection flow. Payment-driven activation/cancellation stays out of
 * scope until the payment phase.
 */
export class SubscriptionsRepository extends BaseRepository<"subscriptions"> {
  constructor(client: SupabaseClient<Database> = getSupabase()) {
    super(client, "subscriptions");
  }

  /** Latest active subscription for a customer, or null when none exists. */
  findLatestActiveByCustomer(customerId: string): Promise<SubscriptionRow | null> {
    return this.findLatestBy({ customer_id: customerId, status: "active" }, "created_at", "id");
  }

  /**
   * Latest PENDING subscription for a customer, or null — the unpaid upgrade
   * that must surface on the Payments page even while an ACTIVE row answers
   * as the effective subscription.
   */
  findLatestPendingByCustomer(customerId: string): Promise<SubscriptionRow | null> {
    return this.findLatestBy({ customer_id: customerId, status: "pending" }, "created_at", "id");
  }

  /**
   * Latest subscription of ANY status for a customer, or null — the
   * customer's "current" subscription view and duplicate-creation guard.
   */
  findLatestByCustomer(customerId: string): Promise<SubscriptionRow | null> {
    return this.findLatestBy({ customer_id: customerId }, "created_at", "id");
  }

  /**
   * Full subscription history for a customer, oldest first (ties broken by
   * id). One query lets services derive active/pending/suspended state for
   * the plan-upgrade rules without N round-trips.
   */
  async listByCustomer(customerId: string): Promise<SubscriptionRow[]> {
    const rows = await this.findManyBy({ customer_id: customerId });
    return rows.sort(
      (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
    );
  }

  /**
   * Finds one subscription owned by exactly this customer (isolation filter
   * for the Phase 3 payment flow), or null.
   */
  findByIdAndCustomer(id: string, customerId: string): Promise<SubscriptionRow | null> {
    return this.findOneBy({ id, customer_id: customerId });
  }
}
