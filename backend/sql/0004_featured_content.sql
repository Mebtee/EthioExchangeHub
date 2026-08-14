-- Admin-controlled Featured Content / Featured Advertisement system.
-- Apply in the Supabase SQL editor (idempotent, safe to re-run).
--
-- SCOPE:
--   * Creates the `featured_content` table powering GET /api/v1/featured (the
--     single currently-eligible campaign shown on the homepage hero) and the
--     admin CRUD surface at /api/v1/admin/featured.
--   * Creates the append-only `featured_content_clicks` table for click
--     tracking (no personal information is stored).
--
-- ELIGIBILITY (enforced by the service layer — this table only stores data):
--   is_active = true
--   AND (start_at IS NULL OR start_at <= now())
--   AND (end_at   IS NULL OR end_at   >= now())
--   Order: display_order ASC, created_at DESC. The homepage shows the first
--   eligible row. Scheduled campaigns are simply rows with a future start_at;
--   they become eligible automatically when their window opens.
--
-- SEEDING: never insert example advertisements here. The homepage gracefully
-- renders no Featured card while this table is empty. See
-- backend/docs/FEATURED_CONTENT.md for a documented local test fixture.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.featured_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  advertiser_name text,
  badge_text text NOT NULL DEFAULT 'FEATURED',
  cta_text text NOT NULL DEFAULT 'Learn More',
  destination_url text NOT NULL,
  destination_type text NOT NULL DEFAULT 'external'
    CHECK (destination_type IN ('internal', 'external')),
  image_alt text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  start_at timestamptz,
  end_at timestamptz,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  feature_1_icon text,
  feature_1_title text,
  feature_1_description text,
  feature_2_icon text,
  feature_2_title text,
  feature_2_description text,
  feature_3_icon text,
  feature_3_title text,
  feature_3_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Serve the public homepage lookup efficiently.
CREATE INDEX IF NOT EXISTS idx_featured_content_active_order
  ON public.featured_content (is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_featured_content_start_at
  ON public.featured_content (start_at);
CREATE INDEX IF NOT EXISTS idx_featured_content_end_at
  ON public.featured_content (end_at);
CREATE INDEX IF NOT EXISTS idx_featured_content_created_at
  ON public.featured_content (created_at);

-- Append-only click analytics. Only references the campaign id, the destination
-- type, and a timestamp — no IP, no user agent, no personal data.
CREATE TABLE IF NOT EXISTS public.featured_content_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  featured_content_id uuid NOT NULL REFERENCES public.featured_content(id) ON DELETE CASCADE,
  destination_type text CHECK (destination_type IN ('internal', 'external')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_featured_content_clicks_content
  ON public.featured_content_clicks (featured_content_id, created_at);

-- ── Row Level Security ────────────────────────────────────────────────────
-- The frontend never talks to Supabase directly — every request goes through
-- the backend API, which authenticates with the service-role client
-- (bypasses RLS). RLS is therefore defense-in-depth for the public schema:
--
--   * Public/anonymous roles may only READ active campaigns (the display
--     layer). Eligibility scheduling (is_active + start_at/end_at) stays in
--     the service, so anon can see scheduled rows early — that is safe, the
--     backend still decides what the homepage actually renders.
--   * Public roles have NO insert/update/delete on `featured_content`, so
--     campaigns cannot be tampered with outside the admin API.
--   * Public roles may INSERT click rows (the click endpoint's backing
--     table) but may not read or modify them.
--   * Admin CRUD continues to work because the service-role client bypasses
--     RLS entirely; `created_by` is written server-side from the session.
ALTER TABLE public.featured_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_content_clicks ENABLE ROW LEVEL SECURITY;

-- Public read of active campaigns only. Idempotent: policies are dropped
-- before (re)creation so this migration stays safe to re-run.
DROP POLICY IF EXISTS "featured_content_public_select_active" ON public.featured_content;
CREATE POLICY "featured_content_public_select_active" ON public.featured_content
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "featured_content_clicks_public_insert" ON public.featured_content_clicks;
CREATE POLICY "featured_content_clicks_public_insert" ON public.featured_content_clicks
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Every other statement type (insert/update/delete on featured_content;
-- select/update/delete on clicks) has no policy, so non-service-role users
-- are denied. The service role is unaffected (bypasses RLS).
