# Security Review

Security posture of the Ethio Exchange Hub backend API. This document reflects
the **actual implemented protections** as of the latest production hardening
phase.

## Middleware order

The order in `src/app.ts` is deliberate — each layer protects the next:

```
trust proxy (env)        → correct client IPs behind nginx/LB
helmet                   → security headers on every response
cors                     → frontend-origin allow-list
compression              → compress responses (≥ 1 KB), skip pre-compressed
body parsing (limits)    → JSON + URL-encoded 1 MB each (413 on overflow)
cookie-parser            → signed/unsigned cookie parsing
slow-down                → gradual delay past threshold (never blocks)
request-id               → X-Request-ID + async-local context
metrics                  → Prometheus counters/histogram
morgan (access log)      → method, path, status, duration, requestId
routes (/health /ready /live /metrics /docs /api/v1)
strict rate limiter      → /docs, /docs.json, /metrics (30/min/IP)
general rate limiter     → /api/v1 (100/min/IP)
auth rate limiter        → /api/v1/auth (10/min/IP, brute-force protection)
notFound → errorHandler  → standardized envelopes, no leaks
```

## Authentication

JWT-based authentication with three token types:

| Token Type     | Purpose           | Lifetime                  | Claim                                |
| -------------- | ----------------- | ------------------------- | ------------------------------------ |
| Access         | API authorization | 15 minutes (configurable) | `{ sub, role, type: "access" }`      |
| Refresh        | Token renewal     | 30 days (configurable)    | `{ sub, type: "refresh" }`           |
| Password Reset | Password change   | 30 minutes (configurable) | `{ sub, purpose: "password-reset" }` |

### Token properties

- Signed with `JWT_SECRET` (minimum 32 characters enforced at boot).
- Tokens are **discriminated** by `type`/`purpose` claims — a stolen refresh
  token cannot be used as an access token (or vice versa).
- Verification checks both the signature and the discriminator.
- Password-reset tokens are **never** returned in HTTP responses; in
  development they are logged server-side only.

### Bootstrap admin

A single administrator account is provisioned from server configuration
(`ADMIN_EMAIL` + `ADMIN_PASSWORD`) on **first login only**. The plaintext
password is never stored — only its scrypt hash. Credentials are provided
via environment variables, never hardcoded in source or SQL migrations.

### Password hashing

- Algorithm: `scrypt` (Node.js built-in).
- Salt: 16 bytes, randomly generated per password.
- Hash: 64 bytes.
- Comparison: constant-time via `timingSafeEqual`.
- Storage format: `salt:hash` (hex-encoded).

## Authorization

### Roles

Two admin roles exist: `admin` and `super_admin`. Both grant full access to
the admin surface. The role is stored in the `users` table and included in
the JWT access token.

### Route protection

The composition root (`src/routes/index.ts`) applies middleware at mount
level:

| Mount path        | Middleware                     | Effect                                      |
| ----------------- | ------------------------------ | ------------------------------------------- |
| `/auth`           | `createAuthLimiter()`          | Rate-limited; individual routes handle auth |
| `/auth/me`        | `requireAuth`                  | Requires valid access token                 |
| `/admin`          | `requireAuth` + `requireAdmin` | Admin-only                                  |
| `/manual-rates`   | `requireAuth` + `requireAdmin` | Admin-only                                  |
| `/admin/featured` | `requireAuth` + `requireAdmin` | Admin-only                                  |
| `/scraper-health` | `requireAuth` + `requireAdmin` | Admin-only                                  |
| `/scrape-logs`    | `requireAuth` + `requireAdmin` | Admin-only                                  |
| `/banks`          | None                           | Public                                      |
| `/rates`          | None                           | Public                                      |
| `/news`           | None                           | Public                                      |
| `/featured`       | None                           | Public (read-only)                          |
| `/contact`        | None                           | Public (write-only)                         |

### `requireAuth` behavior

1. Verifies the `Authorization: Bearer <token>` header.
2. Verifies the token signature and `type: "access"` discriminator.
3. Loads the user from the database (deleted/disabled accounts lose access
   immediately).
4. Attaches the user to `req.user`.

### `requireAdmin` behavior

Checks `req.user.role` against the allowed roles (`admin`, `super_admin`).
Returns 403 on mismatch.

### Frontend route guards

The React frontend wraps all admin routes in `<RequireAuth>` and
`<RequireRole>` components. **These are UX guards, not security boundaries.**
The backend independently enforces authentication on every protected endpoint.

## Public endpoints

The following endpoints are intentionally public (no authentication required):

- `GET /health`, `GET /ready`, `GET /live` — infrastructure probes
- `GET /metrics` — Prometheus metrics (rate-limited)
- `GET /docs`, `GET /docs.json` — OpenAPI documentation (rate-limited)
- `GET /banks`, `GET /banks/active`, `GET /banks/:bankCode` — bank directory
- `GET /rates/latest`, `GET /rates/history/*`, `GET /rates/date-range` — exchange rates
- `GET /news`, `GET /news/categories` — news (placeholder)
- `GET /featured` — active homepage campaign
- `POST /featured/:id/click` — click tracking
- `POST /contact/messages` — contact form submission
- `POST /auth/login` — authentication (rate-limited)
- `POST /auth/refresh` — token renewal (rate-limited)
- `POST /auth/forgot-password` — password reset request (rate-limited)
- `POST /auth/reset-password` — password reset application (rate-limited)

## Rate limiting

Three tiers of rate limiting, all using standard `RateLimit-*` draft-8
headers:

| Limiter | Applied to                        | Default          | Env vars                                 |
| ------- | --------------------------------- | ---------------- | ---------------------------------------- |
| General | `/api/v1/*`                       | 100 req/15min/IP | `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` |
| Strict  | `/docs`, `/docs.json`, `/metrics` | 30 req/15min/IP  | `RATE_LIMIT_STRICT_MAX`                  |
| Auth    | `/auth/*`                         | 10 req/15min/IP  | `AUTH_RATE_LIMIT_MAX`                    |

### Slow-down

`express-slow-down` applies gradual delay past a threshold (default: 50
requests). Each excess request adds 250ms, capped at 2000ms. Never blocks.
Infrastructure probes are skipped.

**Known limitation:** The default in-memory store is per-process. In
multi-instance deployments, rate limits are divided across instances. Consider
a Redis-backed store for horizontal scaling.

## CORS

```ts
const allowedOrigins = new Set(
  env.ALLOWED_ORIGINS.length > 0 ? env.ALLOWED_ORIGINS : [env.FRONTEND_URL],
);
```

- Only configured origins are allowed. Unknown origins are **rejected** — no
  `Access-Control-Allow-Origin` header is emitted.
- `credentials: false` — Bearer tokens are used (no cookies for auth).
- Non-browser clients (no `Origin` header) bypass CORS — intentional for API
  usage.
- **Production requirement:** Set `ALLOWED_ORIGINS=https://ethioexchange.live`.

## Request validation

All API endpoints use Zod schemas with `.strict()` mode — unknown keys are
rejected with 422. Validation is applied via reusable middleware factories:

- `validateParams` — route parameters
- `validateQuery` — query strings
- `validateBody` — request bodies

Password validation enforces minimum 12 characters with uppercase, lowercase,
number, and special character requirements.

Featured content URL validation rejects `javascript:`, `data:`, and
protocol-relative URLs.

## Error handling

The centralized error handler (`middleware/error-handler.ts`) classifies errors:

- **AppError subclasses:** Controlled application errors with HTTP status and
  machine-readable codes. Logged at `warn` level.
- **Body-parser errors:** Mapped to clean 400/413 responses.
- **Unhandled errors:** Production returns generic "Internal server error."
  Non-production returns the error message. Full error + stack is logged
  server-side only.

Stack traces, SQL queries, Supabase URLs/keys, and internal file paths are
**never** sent to clients in production.

## Secrets management

### Environment variables

All secrets are validated at boot via Zod schemas. The server refuses to start
when required values are missing or invalid.

| Variable                    | Required | Description                                                  |
| --------------------------- | -------- | ------------------------------------------------------------ |
| `SUPABASE_URL`              | Yes      | Supabase project URL                                         |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes      | Supabase service-role key (full DB access)                   |
| `JWT_SECRET`                | Yes      | JWT signing secret (min 32 chars)                            |
| `ADMIN_EMAIL`               | Yes      | Bootstrap admin email                                        |
| `ADMIN_PASSWORD`            | Yes      | Bootstrap admin password (min 12 chars, complexity enforced) |
| `ALLOWED_ORIGINS`           | Yes*     | Comma-separated CORS allow-list                              |
| `RESEND_API_KEY`            | No       | Email service API key                                        |
| `OPENAPI_SERVER_URL`        | No       | Override for Swagger UI server URL                           |

### Secret handling

- `.env` files are git-ignored. `.env.example` ships placeholders only.
- Startup logs print only safe configuration (booleans/redacted) — secrets
  are never logged.
- Docker `.dockerignore` excludes `.env` and logs from the build context.
- The production Docker image runs as the unprivileged `node` user.

### Production secrets

Production values must be injected by the deployment platform or secrets
manager. **Never commit real secrets to version control.**

Generate strong secrets:

```bash
# JWT secret
openssl rand -base64 48

# Admin password (use a password manager for production)
```

## Security headers (Helmet)

| Header                                       | Status                                            | Effect                      |
| -------------------------------------------- | ------------------------------------------------- | --------------------------- |
| `Content-Security-Policy`                    | Disabled (API-only; frontend uses Vercel headers) | No user HTML served         |
| `X-Content-Type-Options: nosniff`            | Enabled                                           | Prevents MIME-sniffing      |
| `X-Frame-Options: SAMEORIGIN`                | Enabled (frameguard)                              | Blocks clickjacking         |
| `Referrer-Policy: no-referrer`               | Enabled                                           | No referrer leakage         |
| `Strict-Transport-Security`                  | Production only                                   | HSTS (max-age 1y)           |
| `X-DNS-Prefetch-Control: off`                | Enabled                                           | Disables DNS prefetching    |
| `Cross-Origin-Resource-Policy: cross-origin` | Enabled                                           | Lets SPA read API responses |
| `X-Powered-By`                               | Removed                                           | No framework fingerprint    |

`X-XSS-Protection` is disabled — modern browsers removed support; CSP +
`nosniff` is the effective control.

## Input size limits

| Parser               | Limit | Env var      | Oversize response |
| -------------------- | ----- | ------------ | ----------------- |
| `express.json`       | 1 MB  | `BODY_LIMIT` | 413               |
| `express.urlencoded` | 1 MB  | `BODY_LIMIT` | 413               |

## Deployment security

### Docker

- Multi-stage build: deps → build → runtime.
- Production image uses `node:22-alpine`.
- Runs as unprivileged `node` user.
- Only production dependencies included (`npm ci --omit=dev`).
- Source code is not included in the final image.

### Nginx (optional)

- `server_tokens off` to hide nginx version.
- Forwards `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Request-ID`.
- TLS termination is expected at the platform level (Render/Vercel).

## Database security

### Supabase

- Backend uses the **service-role key** which bypasses Row Level Security.
- The frontend never talks to Supabase directly — all requests go through
  the Express API.

### Row Level Security (RLS)

RLS is enabled as defense-in-depth on:

- `featured_content` — public SELECT for active rows only.
- `featured_content_clicks` — public INSERT only.
- `users` — no public policies (backend service-role only).
- `settings` — no public policies (backend service-role only).
- `contact_messages` — no public policies (backend service-role only).

### Migrations

SQL migrations use idempotent patterns (`IF NOT EXISTS`, `DROP IF EXISTS`).
Rollback is manual. The bootstrap admin is never inserted via migrations.

## What is NOT present (by design)

- **No billing / payments** — out of scope.
- **No file upload** — no upload surface.
- **No OAuth / social login** — JWT-only authentication.
- **No account enumeration** — forgot-password returns identical responses
  for known and unknown emails.
- **No refresh token revocation** — tokens expire naturally. Logout clears
  client-side tokens only. This is a known trade-off for stateless auth.

## Recommendations for production

1. **Rotate `JWT_SECRET`** and the Supabase service-role key on any suspected leak.
2. **Use a persistent rate-limit store** (Redis) when scaling to multiple instances.
3. **Enable CSP** on the frontend via Vercel headers (already configured in `vercel.json`).
4. **Monitor auth failures** — the Prometheus `http_requests_total` metric
   tracks all requests including 401/403 responses.
5. **Restrict `/metrics`** behind authentication or network policy if it
   should not be public.
