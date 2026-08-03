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
process.env.SUPABASE_URL = "https://test-project.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.JWT_SECRET = "test-secret-that-is-long-enough";
process.env.JWT_EXPIRES_IN = "15m";
process.env.REFRESH_TOKEN_EXPIRES_IN = "30d";
process.env.LOG_LEVEL = "fatal";
