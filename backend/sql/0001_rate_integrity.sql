-- Rate integrity constraints (R2 — apply in the Supabase SQL editor).
--
-- These guard the scraped `exchange_rates` dataset at the source:
--   1. Uniqueness on (bank_code, currency_code, rate_date) enables
--      upsert-on-conflict ingestion and prevents silent duplicate rows.
--   2. Positive-rate checks reject negative/zero values before they can be
--      served to the public API.
--
-- IMPORTANT (ops):
--   * Run the dedupe step FIRST if the table already contains duplicates,
--     otherwise the unique constraint will fail to apply.
--   * Nullable rate columns are allowed to stay null (some pairs legitimately
--     publish a buying or selling side only).

-- 0) Remove pre-existing duplicates (keep the newest per key) before adding
--    the constraint. Verify the count of rows this deletes first.
-- DELETE FROM exchange_rates a USING exchange_rates b
--   WHERE a.id < b.id
--     AND a.bank_code = b.bank_code
--     AND a.currency_code = b.currency_code
--     AND a.rate_date = b.rate_date;

-- 1) Natural key — one row per (bank, currency, date).
ALTER TABLE exchange_rates
  ADD CONSTRAINT exchange_rates_key_unique UNIQUE (bank_code, currency_code, rate_date);

-- 2) Positive-rate checks (nullable columns stay nullable).
ALTER TABLE exchange_rates
  ADD CONSTRAINT exchange_rates_buying_positive
  CHECK (buying_rate IS NULL OR buying_rate > 0);

ALTER TABLE exchange_rates
  ADD CONSTRAINT exchange_rates_selling_positive
  CHECK (selling_rate IS NULL OR selling_rate > 0);
