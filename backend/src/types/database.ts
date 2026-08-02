/**
 * Database row types — REALIGNED to the live Supabase schema (Phase 2C).
 *
 * Verified against the configured project via the PostgREST OpenAPI endpoint.
 * The live database is the source of truth; the previous spec-derived shapes
 * (numeric `id` PKs, `bank_id`, `scraper_id`, `slug`, `currency`, ...) did not
 * match reality and have been replaced.
 *
 * Column names are snake_case to match the database. `string` maps to
 * text/uuid/timestamptz/date columns; `number` to numeric/integer; `boolean`
 * to boolean. Nullable columns (not listed as NOT NULL in the schema) are
 * typed `| null`.
 *
 * Declared as `type` aliases (not `interface`) deliberately — TypeScript only
 * gives type aliases/object literals an implicit index signature, which
 * supabase-js's `GenericSchema` requires (rows must satisfy
 * `Record<string, unknown>`). With interfaces the client's `Schema` generic
 * collapses to `never` and every typed query fails to compile.
 *
 * No `any` is used anywhere in this module — every field is explicitly typed.
 */

/**
 * `banks` — bank directory. No numeric id; `bank_code` is the natural key.
 */
export type BankRow = {
  bank_code: string;
  bank_name: string;
  /** e.g. "state_owned" / "private". */
  bank_type: string;
  source_url: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

/**
 * `exchange_rates` — one row per (bank_code, currency_code, rate_date);
 * multiple rate dates per pair exist in the live data.
 */
export type ExchangeRateRow = {
  id: string;
  bank_code: string;
  currency_code: string;
  buying_rate: number | null;
  selling_rate: number | null;
  transactional_buying: number | null;
  transactional_selling: number | null;
  weighted_avg_buying: number | null;
  weighted_avg_selling: number | null;
  /** ISO date (YYYY-MM-DD). */
  rate_date: string;
  /** Observed value "SCRAPER"; free text in the database. */
  source: string | null;
  scraped_at: string | null;
};

/**
 * `manual_rates` — human overrides, keyed like exchange_rates.
 */
export type ManualRateRow = {
  id: string;
  bank_code: string;
  currency_code: string;
  buying_rate: number | null;
  selling_rate: number | null;
  /** ISO date (YYYY-MM-DD). */
  rate_date: string;
  /** FK → auth user id. */
  entered_by: string | null;
  note: string | null;
  created_at: string | null;
};

/**
 * `scraper_health` — per-bank scraper operational stats. No numeric id;
 * `bank_code` is the natural key.
 */
export type ScraperHealthRow = {
  bank_code: string;
  /** Observed value "unknown"; free text in the database. */
  status: string;
  consecutive_failures: number | null;
  last_success: string | null;
  last_failure: string | null;
  /** ISO date (YYYY-MM-DD). */
  last_rate_date: string | null;
  response_time_ms: number | null;
  updated_at: string | null;
};

/**
 * `scrape_logs` — append-only run history. `run_id` groups one run across
 * banks; `bank_code` identifies the scraper target.
 */
export type ScrapeLogRow = {
  id: string;
  run_id: string;
  bank_code: string;
  /** Observed value "success"; free text in the database. */
  status: string;
  /** e.g. "updated" / "unchanged". */
  scenario: string;
  currencies_count: number | null;
  error_message: string | null;
  duration_ms: number | null;
  ran_at: string | null;
};

/**
 * Minimal database schema map for the Supabase client generic.
 *
 * Rows returned by `supabase.from("banks").select()` are typed as
 * `Database["public"]["Tables"]["banks"]["Row"]`. Insert/Update are kept
 * permissive (`Partial<Row>`) on purpose — repositories stay permissive and
 * stricter mutation payloads become a service-layer concern in later phases.
 */
export type DatabaseTables = {
  banks: {
    Row: BankRow;
    Insert: Partial<BankRow>;
    Update: Partial<BankRow>;
    Relationships: [];
  };
  exchange_rates: {
    Row: ExchangeRateRow;
    Insert: Partial<ExchangeRateRow>;
    Update: Partial<ExchangeRateRow>;
    Relationships: [];
  };
  manual_rates: {
    Row: ManualRateRow;
    Insert: Partial<ManualRateRow>;
    Update: Partial<ManualRateRow>;
    Relationships: [];
  };
  scraper_health: {
    Row: ScraperHealthRow;
    Insert: Partial<ScraperHealthRow>;
    Update: Partial<ScraperHealthRow>;
    Relationships: [];
  };
  scrape_logs: {
    Row: ScrapeLogRow;
    Insert: Partial<ScrapeLogRow>;
    Update: Partial<ScrapeLogRow>;
    Relationships: [];
  };
};

export type Database = {
  public: {
    Tables: DatabaseTables;
    /** No views or functions are used — required by supabase-js's GenericSchema. */
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
