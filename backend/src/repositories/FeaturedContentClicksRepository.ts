import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";
import type { Database } from "@/types/database";
import { BaseRepository, type QueryResult } from "./BaseRepository";

/**
 * `featured_content_clicks` repository — append-only click analytics.
 *
 * No update/delete surface exists anywhere in the API; rows are created by
 * the public click endpoint and read (aggregated) by the admin surface.
 *
 * Aggregation cannot use PostgREST's `count()` group-by aggregate: this
 * Supabase instance has aggregate functions disabled (`PGRST123`), so only
 * the `featured_content_id` column is fetched and counted here in JS.
 */
export class FeaturedContentClicksRepository extends BaseRepository<"featured_content_clicks"> {
  constructor(client: SupabaseClient<Database> = getSupabase()) {
    super(client, "featured_content_clicks");
  }

  /** Counts recorded clicks for a featured campaign. */
  async countByContentId(featuredContentId: string): Promise<number> {
    const { count, error } = (await this.client
      .from(this.table)
      .select("id", { count: "exact", head: true })
      .eq("featured_content_id", featuredContentId)) as unknown as {
      count: number | null;
      error: { message: string } | null;
    };
    this.throwIfError(error as never, "countByContentId");
    return count ?? 0;
  }

  /**
   * Returns `featured_content_id -> click count` for every campaign that has
   * clicks. Rows are fetched (id only) and aggregated here in JS, since this
   * instance's PostgREST rejects aggregate functions. Campaigns with zero
   * clicks are simply absent.
   */
  async countByContentIds(): Promise<Map<string, number>> {
    const { data, error } = (await this.client
      .from(this.table)
      .select("featured_content_id")) as unknown as QueryResult<
      Array<{ featured_content_id: string }>
    >;
    this.throwIfError(error, "countByContentIds");
    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      counts.set(row.featured_content_id, (counts.get(row.featured_content_id) ?? 0) + 1);
    }
    return counts;
  }
}
