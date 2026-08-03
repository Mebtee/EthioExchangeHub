/** Global application constants. */

export const APP_NAME = "Ethio Exchange Hub API";

// NOTE: API_VERSION / API_PREFIX / APP_NAME are intentionally unused in
// Phase 1 — they are consumed when versioned routes mount under /api/v1 in
// Phase 2. HEALTH_PATH is used by app.ts; REQUEST_BODY_LIMIT is the default
// for the BODY_LIMIT env var consumed by config/env.ts.

/** API version segment used when routes are mounted in later phases. */
export const API_VERSION = "v1";
export const API_PREFIX = `/api/${API_VERSION}`;

/** Health-check path (infrastructure only — not part of the versioned API). */
export const HEALTH_PATH = "/health";

/** Readiness-check path (Phase 3 — infrastructure only, used by orchestrators). */
export const READY_PATH = "/ready";

/** Liveness-check path (Phase 2K — infrastructure only, used by orchestrators). */
export const LIVE_PATH = "/live";

/** Prometheus metrics path (Phase 2K — infrastructure only, scraped by monitoring). */
export const METRICS_PATH = "/metrics";

/** Default request body limit (Phase 3A) — used as the BODY_LIMIT env default
 * for both JSON and URL-encoded parsers (oversized payloads → 413). */
export const REQUEST_BODY_LIMIT = "1mb";
