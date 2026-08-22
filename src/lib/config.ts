/**
 * Centralized environment configuration.
 * All values come from Vite env vars (prefixed with VITE_) — no hardcoded URLs.
 */
const apiBaseUrl: string | undefined = import.meta.env.VITE_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error(
    "VITE_API_BASE_URL is not defined. Copy .env.example to .env and set VITE_API_BASE_URL (e.g. http://localhost:5000/api/v1).",
  );
}

// Swagger UI is served on the backend root (/docs), not under /api/v1 —
// derive it from the same base URL so docs never drift from the deployment.
const docsUrl = `${apiBaseUrl.replace(/\/api\/v\d+\/?$/, "")}/docs`;

export const config = {
  apiBaseUrl,
  docsUrl,
  apiTimeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 15_000),
} as const;
