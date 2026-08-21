import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";
import type { Database, SubscriptionRow } from "@/types/database";
import { BaseRepository } from "./BaseRepository";

/**
 * `subscriptions` repository (Phase 2B).
 *
 * Phase 2B only READS the latest active subscription to resolve a customer's
 * plan limit (`api_plans.max_api_keys`). Creating/changing subscriptions is
 * billing behavior that stays out of scope until the subscription phase.
 */
export class SubscriptionsRepository extends BaseRepository<"subscriptions"> {
  constructor(client: SupabaseClient<Database> = getSupabase()) {
    super(client, "subscriptions");
  }

  /** Latest active subscription for a customer, or null when none exists. */
  findLatestActiveByCustomer(customerId: string): Promise<SubscriptionRow | null> {
    return this.findLatestBy({ customer_id: customerId, status: "active" }, "created_at", "id");
  }
}
