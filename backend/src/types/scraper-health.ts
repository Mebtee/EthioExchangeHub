/**
 * Scraper-health domain types.
 *
 * There is deliberately NO `scraper_health` table: health is DERIVED at
 * runtime from the append-only `scrape_logs` rows (one row per bank, computed
 * by the scraper-health service). These are domain/view-model types, not
 * database row types.
 */

/** Per-bank scraper operational stats, derived from `scrape_logs`. */
export type ScraperHealthRow = {
  bank_code: string;
  /** Business bucket (healthy / degraded / failed / unknown). */
  status: string;
  consecutive_failures: number | null;
  last_success: string | null;
  last_failure: string | null;
  /** ISO date (YYYY-MM-DD). */
  last_rate_date: string | null;
  response_time_ms: number | null;
  updated_at: string | null;
};
