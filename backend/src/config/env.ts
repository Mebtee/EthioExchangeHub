import { z } from "zod";

import { REQUEST_BODY_LIMIT } from "../constants";

/**
 * dotenv sets every present key in `.env` to a string — including empty ones
 * (e.g. `RESEND_API_KEY=` → `""`). Zod treats `""` as a present value, so an
 * empty placeholder would fail `.min(1)`/`.email()` and crash the server at
 * boot instead of meaning "not configured". Normalize empty/whitespace-only
 * values to `undefined` so `optional()`/`default()` behave as documented
 * ("leave empty to disable").
 */
function emptyToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

/**
 * Environment schema. `process.env` (loaded via `dotenv/config` in index.ts)
 * is validated against this at boot — see `utils/validate-env.ts`, which owns
 * the fail-fast gate and the validated `env` singleton.
 *
 * This module deliberately performs NO parsing itself so the friendly
 * validation error in `validate-env.ts` is the only boot-time failure path.
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(5000),
    /** Origin of the React frontend — legacy single-origin CORS fallback. */
    FRONTEND_URL: z.string().url().default("http://localhost:8080"),
    /**
     * Comma-separated CORS allow-list (e.g. "http://localhost:5173,https://app.example.com").
     * When empty, CORS falls back to FRONTEND_URL so existing deployments keep working.
     */
    ALLOWED_ORIGINS: z
      .string()
      .default("")
      .transform((value) =>
        value
          .split(",")
          .map((origin) => origin.trim())
          .filter(Boolean),
      )
      // Fail fast on malformed entries (e.g. a missing scheme like
      // "localhost:5173") instead of silently adding a never-matching origin to
      // the CORS allow-list. Each entry must be an absolute http(s) origin
      // (no path/query/fragment, no default-port duplicates).
      .refine(
        (origins) =>
          origins.every((origin) => {
            try {
              const url = new URL(origin);
              return (
                (url.protocol === "http:" || url.protocol === "https:") && url.origin === origin
              );
            } catch {
              return false;
            }
          }),
        { message: "ALLOWED_ORIGINS must be a comma-separated list of absolute http(s) origins" },
      ),

    // Secrets are REQUIRED (no defaults) so a missing/invalid configuration
    // fails fast at boot instead of silently running with placeholder values.
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    JWT_SECRET: z.string().min(8),

    // Tuning knobs — safe defaults.
    JWT_EXPIRES_IN: z.string().min(1).default("15m"),
    REFRESH_TOKEN_EXPIRES_IN: z.string().min(1).default("30d"),
    /** Lifetime of the short-lived password-reset token (A1). */
    PASSWORD_RESET_TOKEN_EXPIRES_IN: z.string().min(1).default("30m"),

    /**
     * The single administrator account provisioned on first login (A1).
     * `ADMIN_PASSWORD` is REQUIRED (no default) — the provisioned `users` row
     * stores only its scrypt hash, never the plaintext. Change both in
     * production; the placeholder email matches the frontend login page hint.
     */
    ADMIN_EMAIL: z.string().email().default("admin@ethioexchange.dev"),
    ADMIN_PASSWORD: z.string().min(8),

    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "http", "debug"]).default("info"),

    // ---- Security hardening (Phase 3A) ----
    /** Trust the first proxy hop when behind nginx/load balancer (hops: 1). */
    TRUST_PROXY: z
      .string()
      .default("0")
      .transform((value) => {
        if (value === "true") return true;
        if (value === "false") return false;
        const hops = Number(value);
        return Number.isNaN(hops) ? value : hops;
      }),

    /** Max JSON + URL-encoded request body size (oversized → 413). */
    BODY_LIMIT: z.string().min(1).default(REQUEST_BODY_LIMIT),

    /** General API rate limit: requests allowed per window, per IP. */
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    /** Stricter limit for documentation/metrics endpoints. */
    RATE_LIMIT_STRICT_MAX: z.coerce.number().int().positive().default(30),
    /** Tighter brute-force limit for the /auth surface (login, refresh, reset). */
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

    /**
     * Staleness window (days): a resolved rate row is marked `stale: true` when
     * its `rate_date` is older than this many days before today. Stale rows are
     * always served (never dropped) — consumers decide how to treat them.
     * `0` disables staleness marking.
     *
     * NOTE: default must stay in sync with `DEFAULT_MAX_RATE_AGE_DAYS` in
     * services/helpers/RateResolution.ts. "Today" is the SERVER's local date
     * (`todayLocalIso`), so production deployments targeting Ethiopia should
     * run the container in `Africa/Addis_Ababa` (UTC+3) — otherwise rows are
     * marked stale ~3 hours earlier than the local calendar day would.
     */
    MAX_RATE_AGE_DAYS: z.coerce.number().int().nonnegative().default(7),

    /** Slow-down: requests allowed at full speed before gradual delay begins. */
    SLOW_DOWN_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
    SLOW_DOWN_DELAY_AFTER: z.coerce.number().int().positive().default(50),
    /** Hard cap on the per-request delay (ms) applied by slow-down. */
    SLOW_DOWN_MAX_DELAY_MS: z.coerce.number().int().positive().default(2_000),

    // ---- Email delivery (contact form → support inbox) ----
    /**
     * Resend API key. OPTIONAL — when empty, contact messages are persisted but
     * no email is forwarded (the API still answers 201). Sending is enabled only
     * when this is set AND CONTACT_EMAIL_FROM is a verified Resend sender.
     */
    RESEND_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    /**
     * Verified sender (a domain/address verified in Resend). Required only when
     * RESEND_API_KEY is set — enforced by the refine below. Must NEVER be the
     * visitor's address; the visitor's email is used as Reply-To only.
     */
    CONTACT_EMAIL_FROM: z.preprocess(emptyToUndefined, z.string().email().optional()),
    /** Inbox that receives contact-form submissions (configurable for testing). */
    CONTACT_EMAIL_TO: z.preprocess(
      emptyToUndefined,
      z.string().email().optional().default("ethioexchanges@gmail.com"),
    ),
  })
  .superRefine((value, ctx) => {
    if (value.RESEND_API_KEY && !value.CONTACT_EMAIL_FROM) {
      ctx.addIssue({
        code: "custom",
        path: ["CONTACT_EMAIL_FROM"],
        message: "CONTACT_EMAIL_FROM is required when RESEND_API_KEY is set",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;
