-- Add transactional rate columns to `manual_rates` (apply in the Supabase SQL
-- editor).
--
-- The manual-rates feature must support four rate values: cash buying/selling
-- (already stored in `buying_rate` / `selling_rate`) and transactional
-- buying/selling. The two new columns are nullable so existing rows (and any
-- admin that only publishes cash rates) remain valid — a null transactional
-- value is preserved as null and rendered as an em-dash by the frontend.
--
-- SAFETY:
--   * ALTER TABLE only — no renames, no drops, no data loss.
--   * `ADD COLUMN IF NOT EXISTS` keeps the script idempotent.
--   * Existing `manual_rates` rows are untouched and remain readable.
--
-- No foreign keys or indexes are added: `manual_rates` is keyed by
-- (bank_code, currency_code, rate_date) like `exchange_rates`, and lookups are
-- filtered + sorted by those natural keys, not by the rate columns.

ALTER TABLE public.manual_rates
  ADD COLUMN IF NOT EXISTS transactional_buying numeric,
  ADD COLUMN IF NOT EXISTS transactional_selling numeric;
