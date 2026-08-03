import type { Request, Response } from "express";
import { rateLimit, type Options } from "express-rate-limit";

import { env } from "@/utils/validate-env";

/**
 * Shared rate-limit configuration (Phase 3A).
 *
 * - `standardHeaders: "draft-8"` emits the standardized `RateLimit-*` headers
 *   so clients/proxies can react programmatically.
 * - `legacyHeaders: false` disables the deprecated `X-RateLimit-*` headers.
 * - A 429 response uses the same envelope shape as the rest of the API:
 *   `{ success: false, message, data: null }`.
 *
 * Both factories accept partial overrides (used by unit tests to exercise the
 * 429 path with small limits).
 */
const baseConfig = {
  standardHeaders: "draft-8" as const,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: "Too many requests, please try again later.",
      data: null,
    });
  },
};

/** General API limiter — mounted on `/api/v1` (env-tunable, default 100/min/IP). */
export function createGeneralLimiter(overrides: Partial<Options> = {}) {
  return rateLimit({
    ...baseConfig,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX,
    ...overrides,
  });
}

/** Stricter limiter for `/docs` and `/metrics` (env-tunable, default 30/min/IP). */
export function createStrictLimiter(overrides: Partial<Options> = {}) {
  return rateLimit({
    ...baseConfig,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_STRICT_MAX,
    ...overrides,
  });
}
