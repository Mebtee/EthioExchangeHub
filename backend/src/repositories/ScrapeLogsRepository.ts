import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";
import type { Database, ScrapeLogRow } from "@/types/database";
import { BaseRepository } from "./BaseRepository";

/**
 * `scrape_logs` repository (realigned to the live schema, Phase 2C).
 *
 * Append-only run history. `bank_code` identifies the scraper target and
 * `run_id` groups one run across banks. Standard access is inherited from
 * `BaseRepository`. Query-only — success-rate aggregation belongs to a future
 * service.
 */
export class ScrapeLogsRepository extends BaseRepository<"scrape_logs"> {
  constructor(client: SupabaseClient<Database> = getSupabase()) {
    super(client, "scrape_logs");
  }

  /** Returns all log rows for a bank. */
  findByBankCode(bankCode: string): Promise<ScrapeLogRow[]> {
    return this.findManyBy({ bank_code: bankCode });
  }

  /** Returns all log rows belonging to one scraper run. */
  findByRunId(runId: string): Promise<ScrapeLogRow[]> {
    return this.findManyBy({ run_id: runId });
  }
}
