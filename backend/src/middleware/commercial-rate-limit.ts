import type { Request, RequestHandler, Response } from "express";

/**
 * Plan-scoped requests-per-minute enforcement for the commercial API
 * (Phase 4, Part D).
 *
 * Unlike the general IP-based limiters in `rate-limit.ts` (which keep
 * protecting the whole API surface), this limiter is keyed by the API key id
 * resolved by `createCommercialApiAuth`, so a customer cannot raise their
 * budget by rotating IPs — and two customers never share a bucket. The
 * per-plan budget comes from `plan.requests_per_minute` via the auth context.
 *
 * IMPLEMENTATION NOTE (documented limitation): buckets live in this process's
 * memory — the same trade-off as the existing express-rate-limit setup. On a
 * SINGLE Render instance this is exact; if the service ever scales horizontally,
 * each instance enforces its own window (effective ceiling = N × RPM). Moving
 * to Redis would be required only then; none exists in the project today.
 */

interface Bucket {
  /** Requests already admitted in the current fixed window. */
  count: number;
  /** Absolute epoch-ms when the window resets. */
  resetAt: number;
}

/** One bucket per API key; swept periodically so idle keys do not accumulate. */
const buckets = new Map<string, Bucket>();

/** Sweep interval: generous, since entries are tiny and keys are few. */
const SWEEP_INTERVAL_MS = 5 * 60_000;
/** Buckets older than this after their reset pass are evicted by the sweep. */
let sweepTimer: ReturnType<typeof setInterval> | undefined;

function ensureSweeper(): void {
  if (sweepTimer !== undefined) return;
  sweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, SWEEP_INTERVAL_MS);
  // Never hold the process open just for sweeping.
  sweepTimer.unref?.();
}

/** Test hook: forget every bucket between tests. */
export function resetCommercialRateLimiter(): void {
  buckets.clear();
}

/** Standard rate-limit headers (legacy X- names, as specified in Part D). */
function setRateHeaders(
  res: Response,
  limit: number,
  remaining: number,
  retryAfter?: number,
): void {
  res.setHeader("X-RateLimit-Limit", String(limit));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(0, remaining)));
  if (retryAfter !== undefined) {
    res.setHeader("Retry-After", String(retryAfter));
  }
}

/** Builds the RPM guard; must run AFTER `createCommercialApiAuth`. */
export function createCommercialRateLimiter(): RequestHandler {
  ensureSweeper();
  return (req: Request, res: Response, next): void => {
    const context = req.commercialApi;
    if (!context) {
      // Programming error (misordered middleware) — fail closed.
      res.status(500).json({ success: false, message: "Internal server error.", data: null });
      return;
    }

    const now = Date.now();
    const limit = context.requestsPerMinute;
    let bucket = buckets.get(context.apiKeyId);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + 60_000 };
      buckets.set(context.apiKeyId, bucket);
    }

    if (bucket.count >= limit) {
      setRateHeaders(res, limit, 0, Math.ceil((bucket.resetAt - now) / 1000));
      res.status(429).json({
        success: false,
        message: `Rate limit exceeded: your plan allows ${limit} requests per minute. Retry shortly.`,
        data: null,
      });
      return;
    }

    bucket.count += 1;
    setRateHeaders(res, limit, limit - bucket.count);
    next();
  };
}
