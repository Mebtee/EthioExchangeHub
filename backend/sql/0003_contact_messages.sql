-- Contact messages submitted from the public Contact page.
-- Apply in the Supabase SQL editor (idempotent, safe to re-run).
--
-- SCOPE:
--   * Creates the `contact_messages` table used by POST /api/v1/contact/messages.
--   * Messages are appended only (no update/delete surface in the API) — the
--     table has no CHECK that could be violated by user input beyond NOT NULL.
--
-- Email delivery: the API persists the submission. Actually forwarding it to
-- ethioexchanges@gmail.com requires an email provider (e.g. Resend, SendGrid,
-- SMTP) configured via BACKEND environment variables; no provider is wired yet,
-- so nothing is pretended to be sent.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
