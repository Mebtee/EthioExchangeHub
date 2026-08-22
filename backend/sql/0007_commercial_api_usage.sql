-- Phase 4 — Public commercial API: atomic usage increment.
--
-- The commercial API meters every successful request by incrementing the
-- aggregated `api_usage.request_count` for (api_key_id, period_start). A
-- read-then-write sequence in the backend would race under concurrent
-- requests and silently lose counts (or over-admit past the quota), so the
-- upsert-and-increment runs inside Postgres where it is atomic.
--
-- Idempotent: CREATE OR REPLACE keeps re-runs safe. No existing objects are
-- modified. RLS on `api_usage` is unchanged — SECURITY DEFINER is required
-- because the function is called with the service-role connection anyway,
-- and it keeps the privilege surface identical if that ever changes.

CREATE OR REPLACE FUNCTION public.increment_api_usage(
  p_api_key_id uuid,
  p_subscription_id uuid,
  p_period_start timestamptz,
  p_increment integer DEFAULT 1
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_increment <= 0 THEN
    RAISE EXCEPTION 'p_increment must be positive';
  END IF;

  INSERT INTO public.api_usage AS u (api_key_id, subscription_id, period_start, request_count)
  VALUES (p_api_key_id, p_subscription_id, p_period_start, p_increment)
  ON CONFLICT (api_key_id, period_start)
    DO UPDATE SET
      request_count = u.request_count + EXCLUDED.request_count,
      subscription_id = EXCLUDED.subscription_id,
      updated_at = now()
  RETURNING u.request_count INTO v_count;

  RETURN v_count;
END;
$$;
