import { z } from "zod";

/**
 * Environment schema. `process.env` (loaded via `dotenv/config` in index.ts)
 * is validated against this at boot — see `utils/validate-env.ts`, which owns
 * the fail-fast gate and the validated `env` singleton.
 *
 * This module deliberately performs NO parsing itself so the friendly
 * validation error in `validate-env.ts` is the only boot-time failure path.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  /** Origin of the React frontend, used by the CORS middleware. */
  FRONTEND_URL: z.string().url().default("http://localhost:8080"),

  // Secrets are REQUIRED (no defaults) so a missing/invalid configuration
  // fails fast at boot instead of silently running with placeholder values.
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(8),

  // Tuning knobs — safe defaults.
  JWT_EXPIRES_IN: z.string().min(1).default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().min(1).default("30d"),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "http", "debug"]).default("info"),
});

export type Env = z.infer<typeof envSchema>;
