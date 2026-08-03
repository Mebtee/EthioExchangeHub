/**
 * Test environment bootstrap.
 *
 * `utils/validate-env.ts` validates `process.env` at import time and
 * `process.exit(1)`s when required variables are missing — so the required
 * values must exist BEFORE any `src/` module is imported. Vitest runs this
 * setup file before test files.
 *
 * `LOG_LEVEL` is set to "fatal" so logger/morgan noise is suppressed during
 * the test run (the logger itself is still exercised and covered).
 */

process.env.NODE_ENV = "test";
process.env.PORT = "5000";
process.env.FRONTEND_URL = "http://localhost:5173";
// CORS allow-list exercised by tests/integration/api/security.test.ts.
process.env.ALLOWED_ORIGINS = "http://localhost:5173,http://localhost:3000";
process.env.BODY_LIMIT = "1mb";
process.env.SUPABASE_URL = "https://test-project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.JWT_SECRET = "test-secret-that-is-long-enough";
process.env.JWT_EXPIRES_IN = "15m";
process.env.REFRESH_TOKEN_EXPIRES_IN = "30d";
process.env.LOG_LEVEL = "fatal";

// Phase 3A security hardening: set very high limits so the test suite (which
// shares one 127.0.0.1 IP) never trips rate limiting or slow-down. The limiters
// themselves are exercised via unit tests with small custom limits.
process.env.TRUST_PROXY = "0";
process.env.RATE_LIMIT_WINDOW_MS = "60000";
process.env.RATE_LIMIT_MAX = "100000";
process.env.RATE_LIMIT_STRICT_MAX = "100000";
process.env.SLOW_DOWN_WINDOW_MS = "60000";
process.env.SLOW_DOWN_DELAY_AFTER = "100000";
process.env.SLOW_DOWN_MAX_DELAY_MS = "2000";
