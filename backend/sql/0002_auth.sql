-- Administrator accounts + JWT authentication (A1 — apply in the Supabase SQL editor).
--
-- The `users` table backs the `/auth/*` endpoints and the `requireAuth` guard
-- on the admin surface. The bootstrap admin is NOT inserted here: it is
-- provisioned from server configuration (ADMIN_EMAIL + ADMIN_PASSWORD) on
-- FIRST login, so credentials never live in SQL migrations or plaintext.

CREATE TABLE IF NOT EXISTS public.users (
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
