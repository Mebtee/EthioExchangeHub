/** Global application constants. */

export const APP_NAME = "Ethio Exchange Hub API";

// NOTE: API_VERSION / API_PREFIX / APP_NAME are intentionally unused in
// Phase 1 — they are consumed when versioned routes mount under /api/v1 in
// Phase 2. HEALTH_PATH and REQUEST_BODY_LIMIT are already used by app.ts.

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

export const REQUEST_BODY_LIMIT = "1mb";
