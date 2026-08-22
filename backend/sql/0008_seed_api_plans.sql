-- Phase 7 — Commercial API plan catalog seed.
--
-- The commented example block in 0006_commercial_api_layer.sql left fresh
-- environments with an EMPTY api_plans table. Every commercial endpoint
-- depends on that catalog: GET /customer/plans renders nothing, subscriptions
-- cannot be created (the plan row is required), and payments have nothing to
-- price against. This migration ships the intended three-tier catalog so a
-- newly provisioned database is launch-ready without manual steps.
--
-- Idempotent: ON CONFLICT (slug) DO UPDATE refreshes the catalog fields on
-- re-run instead of failing or duplicating. Plan ids are stable uuids derived
-- from slugs only through their existing rows; existing subscriptions keep
-- referencing the same plan ids after an update because slugs never change.

INSERT INTO public.api_plans (name, slug, description, price, currency,
  billing_interval, monthly_request_limit, requests_per_minute, max_api_keys,
  is_active, display_order)
VALUES
  ('Free', 'free', 'Free tier with limited access', 0, 'ETB', 'monthly',
    2000, 30, 1, true, 1),
  ('Starter', 'starter', 'For small businesses', 499, 'ETB', 'monthly',
    25000, 60, 2, true, 2),
  ('Business', 'business', 'For growing companies', 1499, 'ETB', 'monthly',
    100000, 120, 5, true, 3)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  billing_interval = EXCLUDED.billing_interval,
  monthly_request_limit = EXCLUDED.monthly_request_limit,
  requests_per_minute = EXCLUDED.requests_per_minute,
  max_api_keys = EXCLUDED.max_api_keys,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order,
  updated_at = now();
