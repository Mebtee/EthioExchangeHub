import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { DatabaseError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getSupabase } from "@/lib/supabase";
import type { ApiUsageRow, Database } from "@/types/database";
import { BaseRepository } from "./BaseRepository";

/**
 * `api_usage` repository (Phase 4).
 *
 * One aggregated row per (api_key_id, period_start) — NEVER one row per
 * request. The increment runs through the `increment_api_usage` Postgres
 * function (migration 0007) so concurrent requests cannot lose counts: the
 * insert-or-update happens atomically inside the database, and the new total
 * is returned in the same round trip.
 */
export class ApiUsageRepository extends BaseRepository<"api_usage"> {
  constructor(client: SupabaseClient<Database> = getSupabase()) {
    super(client, "api_usage");
  }

  /** The usage row for a key + billing period, or null before first use. */
  findByKeyAndPeriod(apiKeyId: string, periodStart: string): Promise<ApiUsageRow | null> {
    return this.findOneBy({ api_key_id: apiKeyId, period_start: periodStart });
  }

  /**
   * Atomically adds `increment` requests to the key's current-period counter
   * (creating the row on first use) and returns the new total.
   */
  async increment(
    apiKeyId: string,
    subscriptionId: string,
    periodStart: string,
    increment = 1,
  ): Promise<number> {
    // The generated `Database` type predates migration 0007's RPC, so its
    // rpc() signature resolves params to `undefined`; the call is asserted at
    // this single boundary like every other generic-T query in the codebase.
    const rpc = this.client.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: PostgrestError | null }>;
    const { data, error } = await rpc("increment_api_usage", {
      p_api_key_id: apiKeyId,
      p_subscription_id: subscriptionId,
      p_period_start: periodStart,
      p_increment: increment,
    });
    if (error !== null) {
      logger.error("DATABASE_ERROR", {
        operation: "increment_api_usage",
        table: this.table,
        code: error.code,
        detail: error.message,
      });
      throw new DatabaseError("increment_api_usage failed on api_usage.");
    }
    // postgrest-js types an RPC returning `integer` as `number | null`.
    if (typeof data !== "number") {
      throw new DatabaseError("increment_api_usage returned no count.");
    }
    return data;
  }
}
