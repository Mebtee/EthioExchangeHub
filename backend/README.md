# Ethio Exchange Hub — Backend API

Node.js + Express + TypeScript REST API for Ethio Exchange Hub (Phase 1–3:
foundation, business API, and production-readiness infrastructure).

![Backend CI](https://github.com/your-org/ethio-exchange-hub/actions/workflows/backend-ci.yml/badge.svg)

## Stack

- **Express 4** + **TypeScript 5** (strict)
- **Supabase** (PostgreSQL) via `@supabase/supabase-js`
- **Zod** validation, **Swagger UI** docs at `/docs`
- **Prometheus** metrics (`prom-client`) at `/metrics`
- **Vitest** (294+ tests, coverage thresholds 90/85/90/90)
- **Docker** multi-stage build, **GitHub Actions** CI

## Architecture

```
                    ┌───────────────────────────────┐
   Clients ──────▶  │  Reverse proxy (nginx, TLS)   │
   (frontend,      │  compression, rate limiting    │
    mobile, curl)  └───────────────┬───────────────┘
                                   │ :5000
                    ┌──────────────▼───────────────┐
                    │  Express app (createApp)     │
                    │  trust proxy → helmet → cors │
                    │  compression → body limits   │
                    │  slow-down → requestId       │
                    │  metrics → morgan            │
                    │  /health /ready /live        │
                    │  /metrics  /docs  /api/v1    │
                    │  rate limits → 404/error     │
                    └──────────────┬───────────────┘
                                   │ getSupabase()
                    ┌──────────────▼───────────────┐
                    │  Supabase (PostgreSQL)       │
                    └──────────────────────────────┘
```

Layer flow for the business API: `routes → controllers → services →
repositories → Supabase`. Middleware (request id, metrics, access logging,
validation) wraps the request without touching business logic.

## Local setup

Requirements: Node.js **20+** (CI/Docker use Node 22).

```sh
cd backend
cp .env.example .env   # fill in real values (see below)
npm ci
npm run dev            # tsx watch — restarts on change
```

The server listens on `http://localhost:5000` by default.

### Environment variables

| Variable                    | Required | Default                 | Description                                                     |
| --------------------------- | -------- | ----------------------- | --------------------------------------------------------------- |
| `NODE_ENV`                  | no       | `development`           | `development` \| `test` \| `production`                         |
| `PORT`                      | no       | `5000`                  | HTTP listen port                                                |
| `FRONTEND_URL`              | no       | `http://localhost:8080` | Legacy CORS fallback origin (used when `ALLOWED_ORIGINS` empty) |
| `ALLOWED_ORIGINS`           | no       | — (uses `FRONTEND_URL`) | Comma-separated CORS allow-list (e.g. `http://a,http://b`)      |
| `SUPABASE_URL`              | **yes**  | —                       | Supabase project URL                                            |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes**  | —                       | Supabase service-role key                                       |
| `JWT_SECRET`                | **yes**  | —                       | ≥ 8 chars (auth, later phases)                                  |
| `JWT_EXPIRES_IN`            | no       | `15m`                   | Access-token lifetime                                           |
| `REFRESH_TOKEN_EXPIRES_IN`  | no       | `30d`                   | Refresh-token lifetime                                          |
| `LOG_LEVEL`                 | no       | `info`                  | `fatal` \| `error` \| `warn` \| `info` \| `http` \| `debug`     |
| `TRUST_PROXY`               | no       | `0`                     | Proxy hops for real client IPs (set `1` behind nginx)           |
| `BODY_LIMIT`                | no       | `1mb`                   | Max JSON + URL-encoded request body size (oversize → 413)       |
| `RATE_LIMIT_WINDOW_MS`      | no       | `900000`                | Rate-limit window (15 min)                                      |
| `RATE_LIMIT_MAX`            | no       | `100`                   | General API limit: req / window / IP                            |
| `RATE_LIMIT_STRICT_MAX`     | no       | `30`                    | `/docs` + `/metrics` stricter limit                             |
| `SLOW_DOWN_WINDOW_MS`       | no       | `900000`                | Slow-down window (15 min)                                       |
| `SLOW_DOWN_DELAY_AFTER`     | no       | `50`                    | Requests allowed at full speed before delaying                  |
| `SLOW_DOWN_MAX_DELAY_MS`    | no       | `2000`                  | Max per-request slow-down delay                                 |

Missing required variables fail fast at boot with a readable message.

### Environment profiles

`NODE_ENV` selects the profile (`development` / `test` / `production`):

- **development** — full error details, verbose logging
- **test** — used by Vitest; `LOG_LEVEL=fatal` keeps test output clean
- **production** — generic 500 responses (no stack leaks)

No values are hardcoded; everything flows through the validated `env` singleton.

## Scripts

| Script                  | Description                                   |
| ----------------------- | --------------------------------------------- |
| `npm run dev`           | Watch mode via nodemon                        |
| `npm run dev:tsx`       | Watch mode via tsx                            |
| `npm run build`         | Compile + resolve path aliases to `dist/`     |
| `npm run start`         | Run the compiled `dist/` output               |
| `npm run start:prod`    | `NODE_ENV=production` run                     |
| `npm run typecheck`     | `tsc --noEmit`                                |
| `npm run lint`          | ESLint                                        |
| `npm run format:check`  | Prettier check                                |
| `npm run test`          | Vitest (once)                                 |
| `npm run test:coverage` | Vitest with coverage thresholds (90/85/90/90) |

## Infrastructure endpoints

| Endpoint         | Type       | Behavior                               |
| ---------------- | ---------- | -------------------------------------- |
| `GET /health`    | Health     | Server + DB status (200 / 503)         |
| `GET /ready`     | Readiness  | 200 only when DB reachable, else 503   |
| `GET /live`      | Liveness   | 200 while alive — **no DB call**       |
| `GET /metrics`   | Prometheus | Request + process metrics (text/plain) |
| `GET /docs`      | Swagger UI | OpenAPI 3.1 UI                         |
| `GET /docs.json` | OpenAPI    | Raw document                           |

Every response carries an `X-Request-ID` header; the logger tags each line with
the request id, method, path, and status.

## Monitoring & observability

- **Metrics**: `GET /metrics` exposes `http_requests_total` (method/route/status),
  `http_request_duration_seconds`, and default Node/process metrics (uptime,
  memory, CPU, event-loop delay, GC).
- **Prometheus**: scrape `/metrics` (see `docs/MONITORING.md` for config, alert
  rules, and Grafana panels).
- **Logs**: structured stdout/stderr lines — `[timestamp] LEVEL [requestId=…]`
  plus lifecycle events (startup config, shutdown, uncaught exception,
  unhandled rejection, request completed). Secrets are never logged.

## Production checklist

- [ ] Required env vars set (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`)
- [ ] `NODE_ENV=production` and `ALLOWED_ORIGINS` = real frontend origin(s)
- [ ] `/live`, `/ready`, `/health` return 200
- [ ] `/metrics` scraped by Prometheus; alert rules active (5xx rate, latency)
- [ ] TLS terminated at the proxy; `:5000` not publicly exposed
- [ ] `TRUST_PROXY=1` behind nginx so rate limits key on real client IPs
- [ ] Rate limiting + slow-down active (general 100/15min, strict 30/15min — `docs/SECURITY.md`)
- [ ] DB backups + PITR configured (see `docs/BACKUP_AND_RECOVERY.md`)
- [ ] Graceful shutdown verified (`SIGTERM` → clean exit)
- [ ] Rollout uses `/ready` gate + rolling restart (see `docs/DEPLOYMENT.md`)

## Ops documentation

- `docs/DEPLOYMENT.md` — build, run, nginx, HTTPS, rolling deploys
- `docs/MONITORING.md` — Prometheus scraping, PromQL, alerts, Grafana
- `docs/SECURITY.md` — helmet/CORS/rate-limit/slow-down/body-limits review
- `docs/SECURITY_AUDIT.md` — Phase 3A security audit report (changes, findings, score)
- `docs/BACKUP_AND_RECOVERY.md` — Supabase + env backup, DR checklist
- `RUNBOOK.md` — incident response for the top failure scenarios

## Graceful shutdown

`src/index.ts` handles `SIGINT`/`SIGTERM`:

1. Stops accepting new requests (`server.close()`)
2. Lets in-flight requests finish
3. Logs shutdown progress
4. Exits `0` cleanly (or `1` with a 10s force-exit safety valve)

## Docker

```sh
# Build and run the backend container (http://localhost:5000)
docker compose up --build backend

# With the optional nginx reverse-proxy placeholder (port 80)
docker compose --profile nginx up --build
```

The `backend/Dockerfile` is a multi-stage build (Node 22):

- **deps** — `npm ci` (full tree)
- **build** — TypeScript compile to `dist/`
- **runtime** — only `dist/`, `package.json`, and production deps (`npm ci --omit=dev`)

Run as the unprivileged `node` user. Config comes from environment variables
(see `docker-compose.yml` for defaults and the healthcheck that probes
`/ready`).

## Deployment

1. **Build & push the image** (CI or locally):
   ```sh
   docker build -t ethio-exchange-backend:latest ./backend
   docker push <registry>/ethio-exchange-backend:latest
   ```
2. **Run with real environment variables** — Supabase URL/key and a strong
   `JWT_SECRET` are mandatory:
   ```sh
   docker run -d --name ethio-exchange-backend \
     -p 5000:5000 \
     -e NODE_ENV=production \
     -e SUPABASE_URL=https://your-project.supabase.co \
     -e SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
     -e JWT_SECRET='a-long-random-secret' \
     <registry>/ethio-exchange-backend:latest
   ```
3. **Health gates** — route traffic to the container only after `GET /ready`
   returns `200`; treat `503` as "not ready". Behind a load balancer, enable
   the `/ready` probe and rely on graceful shutdown for zero-downtime deploys.

## CI

`.github/workflows/backend-ci.yml` runs on every push/PR to `main`:

`npm ci` → `typecheck` → `lint` → `format:check` → `test` → `test:coverage` → `build`

The workflow fails if any step fails, so the coverage thresholds are enforced
in CI, not just locally.

## API documentation

The OpenAPI 3.1 document lives in `src/docs/` and is served at `/docs` (Swagger
UI) and `/docs.json`. It is generated from the code, never the reverse.

## Testing

See `tests/README.md` for the full testing-layer documentation. All tests run
against mocks and an in-memory fake Supabase client — never a real database.
