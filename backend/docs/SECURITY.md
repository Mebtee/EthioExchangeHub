# Security Review

Infrastructure-only security posture of the backend API. **There is no
authentication, billing, or payment in this application** — all API endpoints
are public. This document reviews every enabled protection layer.

## Protection layers

### Helmet

`helmet` is enabled globally with `crossOriginResourcePolicy: { policy: "cross-origin" }`.

Enabled by default (Helmet v7 sets these headers):

| Header                                       | Effect                                          |
| -------------------------------------------- | ----------------------------------------------- |
| `Content-Security-Policy`                    | Restricts resource loading (default-src 'self') |
| `X-Content-Type-Options: nosniff`            | Prevents MIME-sniffing                          |
| `X-Frame-Options: SAMEORIGIN`                | Blocks clickjacking via framing                 |
| `Referrer-Policy`                            | Limits referrer leakage                         |
| `Strict-Transport-Security`                  | HSTS (in prod via HTTPS)                        |
| `Cross-Origin-Resource-Policy: cross-origin` | Allows the frontend to read API responses       |
| `X-DNS-Prefetch-Control`                     | Disables DNS prefetching                        |

Note: `Cross-Origin-Resource-Policy` is intentionally `cross-origin` so the
React frontend (a different origin) can consume the API.

### CORS

```ts
cors({ origin: env.FRONTEND_URL, credentials: true });
```

- Only the configured frontend origin is allowed (no `*`).
- `credentials: true` is set — future auth cookies will work; the origin list
  must stay explicit.
- Preflight (`OPTIONS`) is handled by the middleware.

### Cookie settings

`cookie-parser` is enabled (no `express-session`). No cookies are currently
written by the application (no auth yet). When auth is added:

- Use `httpOnly` + `secure` (production) + `sameSite: "lax"|"strict"` for session cookies.
- Never store the JWT in localStorage from server-rendered flows; prefer httpOnly cookies.

### Compression

`compression({ threshold: 1024 })` — enabled globally.

- Responses **≥ 1 KB** are gzip-compressed; smaller responses are sent raw.
- Exclusions (automatic, per the `compression` package):
  - Responses already carrying a `Content-Encoding` header.
  - Streaming responses (`Transfer-Encoding: chunked` with no content-length).
  - Content types that are already compressed (images, archives).
- The `Cache-Control: no-transform` header is respected.

### Request headers

| Header                   | Source                     | Purpose                                             |
| ------------------------ | -------------------------- | --------------------------------------------------- |
| `X-Request-ID`           | `middleware/request-id.ts` | Correlation id (echoes safe incoming id, else UUID) |
| `Content-Type` (metrics) | `lib/metrics.ts`           | `text/plain; version=0.0.4; charset=utf-8`          |
| Standard API envelope    | `utils/api-response.ts`    | Uniform `{ success, message, data }`                |

### Rate limiting

**Not enabled.** All endpoints are public and unauthenticated. Before public
exposure, add rate limiting (e.g. `express-rate-limit`) behind the proxy or in
the app to mitigate abuse. See recommendations below.

### Body limits

`express.json` / `express.urlencoded` are limited to `1mb`
(`REQUEST_BODY_LIMIT`), preventing oversized-payload abuse.

## What is NOT present (by design)

- **No authentication** — no login, no sessions, no JWT enforcement.
- **No billing / payments** — out of scope.
- **No file upload** — no upload surface.
- **No secret exposure** — startup logs only safe configuration; Supabase
  credentials and JWT secrets are never logged.

## Environment safety

- `.env` is git-ignored; `.env.example` documents variables without real values.
- `NODE_ENV=production` hides stack traces in 500 responses
  (`error-handler.ts`).
- Docker `.dockerignore` excludes `.env` and logs from the build context.
- The production Docker image runs as the unprivileged `node` user.

## Recommendations before public launch

1. **Add rate limiting** per IP (`express-rate-limit` or proxy-level).
2. **Enable auth** (the OpenAPI doc already declares a `bearerAuth` scheme for
   future use) before exposing write endpoints.
3. **Terminate TLS** at the proxy; keep `:5000` private.
4. Add an **ingress allow-list / WAF** at the proxy for `/metrics` if it should
   not be public.
5. Rotate `JWT_SECRET` and the Supabase service-role key on any suspected leak.
