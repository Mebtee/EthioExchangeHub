/**
 * Centralized environment configuration.
 *
 * The API base URL is set via the VITE_API_BASE_URL env var when present
 * (e.g. local development). It falls back to the production API so the app
 * builds and runs on a static host (Vercel) even without a VITE_ env var —
 * VITE_ variables are public by design, and baking in the public production
 * URL avoids any build-time configuration drift.
 */
const DEFAULT_API_BASE_URL = "https://api.ethioexchange.live/api/v1";

const apiBaseUrl: string = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;

// Swagger UI is served on the backend root (/docs), not under /api/v1 —
// derive it from the same base URL so docs never drift from the deployment.
const docsUrl = `${apiBaseUrl.replace(/\/api\/v\d+\/?$/, "")}/docs`;

export const config = {
  apiBaseUrl,
  docsUrl,
  apiTimeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 15_000),
} as const;
