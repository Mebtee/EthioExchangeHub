import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";
import type { ApiPlanRow, Database } from "@/types/database";
import { BaseRepository } from "./BaseRepository";

/**
 * `api_plans` repository (Phase 2B) — read-only lookups used to resolve the
 * `max_api_keys` limit of a customer's active subscription. Plan management
 * belongs to a later phase.
 */
export class ApiPlansRepository extends BaseRepository<"api_plans"> {
  constructor(client: SupabaseClient<Database> = getSupabase()) {
    super(client, "api_plans");
  }

  /** Finds one plan by id, or null when absent. */
  findById(id: string): Promise<ApiPlanRow | null> {
    return this.findOneBy({ id });
  }
}
