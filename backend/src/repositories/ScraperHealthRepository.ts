import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";
import type { Database, ScraperHealthRow } from "@/types/database";
import { BaseRepository } from "./BaseRepository";

/**
 * `scraper_health` repository (realigned to the live schema, Phase 2C).
 *
 * Per-bank scraper stats; `bank_code` is the natural key (no numeric id).
 * Standard access is inherited from `BaseRepository`. Query-only — aggregation
 * over `scrape_logs` belongs to a future service.
 */
export class ScraperHealthRepository extends BaseRepository<"scraper_health"> {
  constructor(client: SupabaseClient<Database> = getSupabase()) {
    super(client, "scraper_health");
  }

  /** Finds the health row for a bank. */
  findByBankCode(bankCode: string): Promise<ScraperHealthRow | null> {
    return this.findOneBy({ bank_code: bankCode });
  }
}
