import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";
import type { Database, FeaturedContentRow } from "@/types/database";
import { BaseRepository, type QueryResult } from "./BaseRepository";

/**
 * `featured_content` repository.
 *
 * Data access only — eligibility rules (is_active + schedule window) and
 * display-order selection live in the service layer. `findAllActive` returns
 * every row with `is_active = true` ordered by `display_order` ascending and
 * `created_at` descending, which is the ordering the selection rule requires;
 * the service still re-applies the rule deterministically.
 */
export class FeaturedContentRepository extends BaseRepository<"featured_content"> {
  constructor(client: SupabaseClient<Database> = getSupabase()) {
    super(client, "featured_content");
  }

  /** Returns every active row in the canonical selection order. */
  async findAllActive(): Promise<FeaturedContentRow[]> {
    const { data, error } = (await this.client
      .from(this.table)
      .select()
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false })) as unknown as QueryResult<FeaturedContentRow[]>;
    this.throwIfError(error, "findAllActive");
    return data ?? [];
  }
}
