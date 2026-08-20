-- RLS defense-in-depth for tables that previously had no policies.
-- Apply in the Supabase SQL editor (idempotent, safe to re-run).
--
-- PRINCIPLE:
--   The backend uses the Supabase service-role key, which bypasses RLS
--   entirely. These policies ensure that if any future code path allows
--   direct Supabase client access (e.g. a misconfigured frontend or a new
--   integration), the tables are NOT fully exposed.
--
--   - No public/anonymous/authenticated access to users or settings.
--   - contact_messages allows INSERT only (for the public contact form),
--     but no SELECT/UPDATE/DELETE from non-service-role clients.
--
-- These policies do NOT affect the backend API, which uses service-role.

-- ── users ────────────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Deny all non-service-role access. No policies means all statements are
-- denied for anon/authenticated roles when RLS is enabled.
-- (Explicit DROP + CREATE for idempotency.)
DROP POLICY IF EXISTS "users_no_public_access" ON public.users;
CREATE POLICY "users_no_public_access" ON public.users
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ── settings ─────────────────────────────────────────────────────────────
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_no_public_access" ON public.settings;
CREATE POLICY "settings_no_public_access" ON public.settings
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ── contact_messages ─────────────────────────────────────────────────────
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Public INSERT for the contact form (POST /api/v1/contact/messages).
-- The backend service-role bypasses RLS, so this policy is for defense-in-depth.
DROP POLICY IF EXISTS "contact_messages_public_insert" ON public.contact_messages;
CREATE POLICY "contact_messages_public_insert" ON public.contact_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- No SELECT/UPDATE/DELETE policies for non-service-role.
-- This means anonymous/authenticated roles can submit but not read back messages.
