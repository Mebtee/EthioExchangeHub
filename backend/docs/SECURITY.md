# Security Review

Infrastructure-only security posture of the backend API. **There is no
authentication, billing, or payment in this application** — all API endpoints
are public. This document reviews every enabled protection layer (Phase 3A
hardening).

## Middleware order (Phase 3A)

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
notFound → errorHandler  → standardized envelopes, no leaks
```

## Protection layers

### Helmet

`helmet` is enabled globally with production-safe, environment-aware options:

```ts
helmet({
  contentSecurityPolicy: false, // no user-controlled HTML served
  strictTransportSecurity:
    NODE_ENV === "production"
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
  referrerPolicy: { policy: "no-referrer" },
  dnsPrefetchControl: { allow: false },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  xXssProtection: false, // deprecated by browsers; CSP+nosniff cover it
});
```

| Header                                       | Status                  | Effect                                          |
| -------------------------------------------- | ----------------------- | ----------------------------------------------- |
| `Content-Security-Policy`                    | **disabled** (explicit) | No user HTML served; enable via env when needed |
| `X-Content-Type-Options: nosniff`            | on                      | Prevents MIME-sniffing                          |
| `X-Frame-Options: SAMEORIGIN`                | on (frameguard)         | Blocks clickjacking via framing                 |
| `Referrer-Policy: no-referrer`               | on                      | No referrer leakage                             |
| `Strict-Transport-Security`                  | **production only**     | HSTS (max-age 1y, includeSubDomains, preload)   |
| `X-DNS-Prefetch-Control: off`                | on                      | Disables DNS prefetching                        |
| `Cross-Origin-Resource-Policy: cross-origin` | on                      | Lets the React SPA read API responses           |
| `X-Powered-By`                               | removed (hidePoweredBy) | No framework fingerprint                        |

`X-XSS-Protection` is explicitly disabled: modern browsers removed support for
it, and the CSP + `nosniff` combination is the effective control.

### CORS

```ts
const allowedOrigins = new Set(
  env.ALLOWED_ORIGINS.length > 0 ? env.ALLOWED_ORIGINS : [env.FRONTEND_URL],
);

cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.has(origin)) cb(null, true);
    else cb(null, false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: false,
});
```

- Only the configured **allow-list** is allowed: `ALLOWED_ORIGINS`
  (comma-separated, e.g. `ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173`);
  when unset it falls back to the legacy `FRONTEND_URL`. **Unknown origins are
  rejected** — no `Access-Control-Allow-Origin` header is emitted, so browsers
  block the response. No `*`.
- `credentials: false` — the API is authentication-free, so we never advertise
  credential support (`Access-Control-Allow-Credentials` is not emitted).
- All standard methods + preflight `OPTIONS` are supported.
- Non-browser clients (no `Origin` header) pass through untouched.
- **Local development**: set `ALLOWED_ORIGINS` to your dev-server origin(s)
  (e.g. `http://localhost:5173` for Vite).

### Rate limiting (`express-rate-limit` v8)

Two limiters, both using standard `RateLimit-*` headers (`standardHeaders:
"draft-8"`) with **no legacy** `X-RateLimit-*` headers:

| Limiter | Applied to                        | Default limit    | Env vars                                 |
| ------- | --------------------------------- | ---------------- | ---------------------------------------- |
| General | `/api/v1/*`                       | 100 req/15min/IP | `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` |
| Strict  | `/docs`, `/docs.json`, `/metrics` | 30 req/15min/IP  | `RATE_LIMIT_STRICT_MAX`                  |

Exceeding the limit returns `429 { success: false, message, data: null }`.
Health/readiness/liveness probes are intentionally **not** rate-limited so
orchestrators and load balancers are never throttled.

### Slow-down (`express-slow-down` v3)

Applied globally **after** cookie parsing, **before** routes:

- `SLOW_DOWN_DELAY_AFTER` (default 50) requests per window run at full speed.
- Past the threshold, each response is delayed gradually — `250 ms` per excess
  request, capped at `SLOW_DOWN_MAX_DELAY_MS` (default 2000 ms).
- Never blocks — clients are always eventually served, making brute-force
  and scrape loops expensive without breaking legitimate traffic.
- Infrastructure probe paths (`/health`, `/ready`, `/live`, `/metrics`,
  `/docs`, `/docs.json`) are skipped.

### Request size limits

| Parser               | Limit (default) | Env/constant | Oversize response |
| -------------------- | --------------- | ------------ | ----------------- |
| `express.json`       | `1mb`           | `BODY_LIMIT` | `413`             |
| `express.urlencoded` | `1mb`           | `BODY_LIMIT` | `413`             |

Malformed JSON bodies are rejected with `400` (`entity.parse.failed` is mapped
in `error-handler.ts`). Oversized payloads are rejected with `413`
(`entity.too.large`) — no request ever buffers unbounded data.

### Trust proxy

`app.set("trust proxy", env.TRUST_PROXY)` — set to the number of proxy hops
behind nginx/a load balancer (e.g. `1`) so `req.ip` and rate-limit keys
reflect the **real client address**. Default `0` (off) keeps direct
connections correct.

### Compression

`compression({ threshold: 1024 })` — enabled globally, registered after
helmet/CORS and before routes:

- Responses **≥ 1 KB** are gzip-compressed; smaller responses are sent raw.
- Exclusions (automatic, per the `compression` package):
  - Responses already carrying a `Content-Encoding` header (never double-compressed).
  - Streaming responses (`Transfer-Encoding: chunked` without content-length).
  - Content types that are already compressed (images, archives).
- The `Cache-Control: no-transform` header is respected.

### Error leakage

- **Production** never exposes stack traces, SQL, Supabase URLs/keys, or file
  paths: unknown errors return the generic `"Internal server error."`
  (`error-handler.ts`, gated on `NODE_ENV`).
- Database errors are wrapped (`DatabaseError`) with a generic client message;
  the underlying cause is only written to server logs.
- Body-parser errors map to clean `400` / `413` envelopes.

### Secret handling

- `.env` is git-ignored; `.env.example` ships placeholders only.
- Startup logs print only safe configuration (booleans/redacted) — secrets
  (`SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`) are never logged.
- Docker `.dockerignore` excludes `.env` and logs from the build context.
- The production Docker image runs as the unprivileged `node` user.

## What is NOT present (by design)

- **No authentication** — no login, no sessions, no JWT enforcement (auth is a
  later phase; the OpenAPI doc already declares a `bearerAuth` scheme).
- **No billing / payments** — out of scope.
- **No file upload** — no upload surface.
- **No secret exposure** — verified by the Phase 3A secret audit.

## Recommendations before public launch

1. **Terminate TLS** at the proxy; keep `:5000` private (HSTS only helps over HTTPS).
2. Add an **ingress allow-list / WAF** at the proxy for `/metrics` if it should
   not be public.
3. **Enable auth** before exposing write endpoints.
4. Rotate `JWT_SECRET` and the Supabase service-role key on any suspected leak.
5. Consider a **persistent rate-limit store** (Redis) when scaling to multiple
   instances — the default in-memory store is per-process.
