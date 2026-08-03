import slowDown from "express-slow-down";

import { HEALTH_PATH, LIVE_PATH, METRICS_PATH, READY_PATH } from "@/constants";
import { env } from "@/utils/validate-env";

/**
 * Slow-down middleware (Phase 3A).
 *
 * Unlike rate limiting, slow-down never blocks: after `delayAfter` requests in
 * the window it introduces a gradual per-request delay (250 ms per excess
 * request, capped at `SLOW_DOWN_MAX_DELAY_MS`). This thwarts brute-force /
 * scrape loops while keeping clients responsive.
 *
 * Infrastructure probes (/health, /ready, /live, /metrics, /docs) are skipped
 * so monitoring and docs are never throttled.
 */
const INFRA_PATHS = new Set<string>([
  HEALTH_PATH,
  READY_PATH,
  LIVE_PATH,
  METRICS_PATH,
  "/docs",
  "/docs.json",
]);

/** Exact infra paths plus Swagger UI asset subpaths under /docs/*. */
function isInfraPath(path: string): boolean {
  return INFRA_PATHS.has(path) || path.startsWith("/docs/");
}

/** Factory accepts partial overrides (used by unit tests to verify the delay). */
export function createSlowDown(overrides: Partial<Parameters<typeof slowDown>[0]> = {}) {
  return slowDown({
    windowMs: env.SLOW_DOWN_WINDOW_MS,
    delayAfter: env.SLOW_DOWN_DELAY_AFTER,
    maxDelayMs: env.SLOW_DOWN_MAX_DELAY_MS,
    // `used` = number of requests beyond the threshold — grow the delay
    // gradually (never a sudden block) up to the configured cap.
    delayMs: (used: number) => Math.min(used * 250, env.SLOW_DOWN_MAX_DELAY_MS),
    skip: (req) => isInfraPath(req.path),
    ...overrides,
  });
}
