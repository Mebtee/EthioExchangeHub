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
   * Latest subscription of ANY status for a customer, or null — the
   * customer's "current" subscription view and duplicate-creation guard.
   */
  findLatestByCustomer(customerId: string): Promise<SubscriptionRow | null> {
    return this.findLatestBy({ customer_id: customerId }, "created_at", "id");
  }

  /**
   * Finds one subscription owned by exactly this customer (isolation filter
   * for the Phase 3 payment flow), or null.
   */
  findByIdAndCustomer(id: string, customerId: string): Promise<SubscriptionRow | null> {
    return this.findOneBy({ id, customer_id: customerId });
  }
}
