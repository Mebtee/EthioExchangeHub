import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";
import type { ApiPlanRow, Database } from "@/types/database";
import { BaseRepository, type QueryResult } from "./BaseRepository";

/**
 * `api_plans` repository (Phase 2B/2C) — read-only lookups: plan resolution
 * for API-key limits (Phase 2B) and the customer-facing active-plan catalog
 * (Phase 2C). Plan management belongs to a later phase.
 */
export class ApiPlansRepository extends BaseRepository<"api_plans"> {
  constructor(client: SupabaseClient<Database> = getSupabase()) {
    super(client, "api_plans");
  }

  /** Finds one plan by id, or null when absent. */
  findById(id: string): Promise<ApiPlanRow | null> {
    return this.findOneBy({ id });
  }

  /** Active plans in catalog order (display_order, then name). */
  async findActiveOrdered(): Promise<ApiPlanRow[]> {
    const query = this.client
      .from(this.table)
      .select()
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });
    const { data, error } = (await query) as unknown as QueryResult<ApiPlanRow[]>;
    this.throwIfError(error, "findActiveOrdered");
    return data ?? [];
  }
}
