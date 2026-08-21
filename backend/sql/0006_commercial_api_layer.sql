-- Commercial API layer — customer identity, plans, keys, subscriptions,
-- payments, usage tracking, and bank-payment configuration.
--
-- This migration:
--   1. Extends the users role CHECK to include 'customer'.
--   2. Creates 8 new tables for the commercial API platform.
--   3. Enables RLS with deny-all policies on all new tables.
--   4. Adds indexes for frequent lookups.
--
-- All statements use IF NOT EXISTS / IF EXISTS for idempotency.
-- No existing data is modified or destroyed.
--
-- The backend uses the Supabase service-role key which bypasses RLS.
-- RLS is defense-in-depth against direct anonymous/authenticated access.
--
-- Seed data for api_plans is documented at the bottom as commented-out
-- INSERT statements. Actual plan data should be inserted manually or
-- via a future admin tool once pricing is finalized.

-- ============================================================
-- 1. EXTEND USERS ROLE CONSTRAINT
-- ============================================================

-- Drop the existing CHECK constraint and recreate with 'customer' added.
-- This is safe because the existing roles ('admin', 'super_admin') remain
-- valid; we are only expanding the allowed set.
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'super_admin', 'customer'));

-- ============================================================
-- 2. API PLANS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.api_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price numeric(10, 2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ETB',
  billing_interval text NOT NULL DEFAULT 'monthly'
    CHECK (billing_interval IN ('monthly')),
  monthly_request_limit integer NOT NULL DEFAULT 0
    CHECK (monthly_request_limit >= 0),
  requests_per_minute integer NOT NULL DEFAULT 0
    CHECK (requests_per_minute >= 0),
  max_api_keys integer NOT NULL DEFAULT 1
    CHECK (max_api_keys >= 0),
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_plans_slug
  ON public.api_plans (slug);

CREATE INDEX IF NOT EXISTS idx_api_plans_active
  ON public.api_plans (is_active, display_order);

-- ============================================================
-- 3. CUSTOMERS (profile extending users)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE
    REFERENCES public.users(id) ON DELETE CASCADE,
  company_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_user_id
  ON public.customers (user_id);

-- ============================================================
-- 4. API KEYS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL
    REFERENCES public.customers(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_customer
  ON public.api_keys (customer_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix
  ON public.api_keys (key_prefix);

-- ============================================================
-- 5. SUBSCRIPTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL
    REFERENCES public.customers(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL
    REFERENCES public.api_plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'expired', 'cancelled', 'suspended')),
  starts_at timestamptz,
  ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_customer
  ON public.subscriptions (customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON public.subscriptions (status);

-- ============================================================
-- 6. PAYMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL
    REFERENCES public.customers(id) ON DELETE CASCADE,
  subscription_id uuid
    REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  plan_id uuid NOT NULL
    REFERENCES public.api_plans(id) ON DELETE RESTRICT,
  amount numeric(10, 2) NOT NULL
    CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'ETB',
  payment_reference text NOT NULL UNIQUE,
  customer_transaction_ref text,
  payment_method text NOT NULL DEFAULT 'bank_transfer'
    CHECK (payment_method IN ('bank_transfer')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'cancelled')),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid
    REFERENCES public.users(id) ON DELETE SET NULL,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_customer
  ON public.payments (customer_id);

CREATE INDEX IF NOT EXISTS idx_payments_reference
  ON public.payments (payment_reference);

CREATE INDEX IF NOT EXISTS idx_payments_status
  ON public.payments (status);

-- ============================================================
-- 7. PAYMENT RECEIPTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL
    REFERENCES public.payments(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  original_filename text,
  mime_type text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_receipts_payment
  ON public.payment_receipts (payment_id);

-- ============================================================
-- 8. API USAGE (aggregated per key per billing period)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid NOT NULL
    REFERENCES public.api_keys(id) ON DELETE CASCADE,
  subscription_id uuid
    REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  period_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0
    CHECK (request_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (api_key_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_api_usage_key_period
  ON public.api_usage (api_key_id, period_start);

-- ============================================================
-- 9. BANK PAYMENT CONFIGURATION
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bank_payment_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  account_name text NOT NULL,
  account_number text NOT NULL,
  branch_name text,
  instructions text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_payment_config_active
  ON public.bank_payment_config (is_active);

-- ============================================================
-- 10. ROW LEVEL SECURITY (defense-in-depth)
-- ============================================================

-- All new commercial tables: deny all direct access from anon/authenticated.
-- The backend service-role key bypasses RLS for normal operation.

-- api_plans
ALTER TABLE public.api_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_plans_no_public_access" ON public.api_plans;
CREATE POLICY "api_plans_no_public_access" ON public.api_plans
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customers_no_public_access" ON public.customers;
CREATE POLICY "customers_no_public_access" ON public.customers
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_keys_no_public_access" ON public.api_keys;
CREATE POLICY "api_keys_no_public_access" ON public.api_keys
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscriptions_no_public_access" ON public.subscriptions;
CREATE POLICY "subscriptions_no_public_access" ON public.subscriptions
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_no_public_access" ON public.payments;
CREATE POLICY "payments_no_public_access" ON public.payments
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- payment_receipts
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_receipts_no_public_access" ON public.payment_receipts;
CREATE POLICY "payment_receipts_no_public_access" ON public.payment_receipts
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- api_usage
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_usage_no_public_access" ON public.api_usage;
CREATE POLICY "api_usage_no_public_access" ON public.api_usage
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- bank_payment_config
ALTER TABLE public.bank_payment_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bank_payment_config_no_public_access" ON public.bank_payment_config;
CREATE POLICY "bank_payment_config_no_public_access" ON public.bank_payment_config
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- ============================================================
-- SEED DATA (commented out — uncomment and adjust after pricing
-- is finalized. These are example values only.)
-- ============================================================

-- INSERT INTO public.api_plans (name, slug, description, price, currency,
--   billing_interval, monthly_request_limit, requests_per_minute, max_api_keys,
--   is_active, display_order)
-- VALUES
--   ('Free', 'free', 'Free tier with limited access', 0, 'ETB', 'monthly',
--     2000, 30, 1, true, 1),
--   ('Starter', 'starter', 'For small businesses', 499, 'ETB', 'monthly',
--     25000, 60, 2, true, 2),
--   ('Business', 'business', 'For growing companies', 1499, 'ETB', 'monthly',
--     100000, 120, 5, true, 3);
