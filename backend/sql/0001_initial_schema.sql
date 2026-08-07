-- Initial schema — realign the empty `users` and `settings` stubs to the
-- schema the backend expects (apply in the Supabase SQL editor).
--
-- SCOPE (read carefully before running):
--   * The live `users` and `settings` tables are EMPTY stubs created manually
--     in Supabase (only `id bigint` + `created_at`, zero rows). This migration
--     DROPs and recreates them with the exact columns the backend code reads
--     and writes. No data is lost because there is none.
--   * The production data tables are deliberately NOT touched:
--       - banks
--       - exchange_rates
--       - manual_rates
--       - scrape_logs
--   * There is deliberately NO `scraper_health` table. Scraper health is
--     derived from `scrape_logs` at runtime; do not recreate that table.
--
-- The backend bootstrap admin is NOT inserted here. It is provisioned from
-- server configuration (ADMIN_EMAIL + ADMIN_PASSWORD) on FIRST login, so
-- credentials never live in SQL migrations or plaintext.

-- gen_random_uuid() is built into PostgreSQL 13+ (Supabase is on a newer
-- version); the guard keeps the script idempotent on older Postgres.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- The stub tables are empty, so a straight DROP is safe.
DROP TABLE IF EXISTS public.settings;
DROP TABLE IF EXISTS public.users;

-- Administrator accounts backing JWT authentication (/auth/*, requireAuth).
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  password_hash text NOT NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  CONSTRAINT users_role_check CHECK (role IN ('admin', 'super_admin'))
);

-- Email lookups power login and password reset; the UNIQUE constraint above
-- already backs them with an index, so no extra index is needed.

-- Key/value admin configuration persisted by the settings service. `key` is
-- the natural key (no id); booleans/numbers are serialized to text by the
-- service layer.
CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
