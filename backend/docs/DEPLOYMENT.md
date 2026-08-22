# Production Deployment Guide

This guide covers deploying the Ethio Exchange Hub backend API to production.

## Architecture

```
                     ┌────────────────────────────┐
   Clients ───────▶ │  Reverse proxy (nginx)     │
   (frontend,       │  TLS termination, gzip,    │
    mobile, curl)   │  request routing           │
                     └────────────┬───────────────┘
                                  │ :5000
                     ┌────────────▼───────────────┐
                     │  Backend container         │
                     │  Express + TypeScript      │
                     │  - /health /ready /live    │
                     │  - /metrics (Prometheus)   │
                     │  - /api/v1 (business API)  │
                     │  - /docs (Swagger UI)      │
                     └────────────┬───────────────┘
                                  │ Supabase client
                     ┌────────────▼───────────────┐
                     │  Supabase (managed PG)     │
                     └────────────────────────────┘
```

## Requirements

- Docker 24+ / Docker Compose v2
- A Supabase project (URL + service-role key)
- Node 22 (local builds; the image builds its own toolchain)

## Environment variables

| Variable                                      | Required | Notes                                                                                    |
| --------------------------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `NODE_ENV`                                    | no       | Set to `production` in deployed environments (also fixes the docs server URL fallback)   |
| `PORT`                                        | no       | Default `5000`                                                                           |
| `ALLOWED_ORIGINS`                             | yes*     | Comma-separated CORS allow-list — must include the deployed frontend origin              |
| `FRONTEND_URL`                                | no       | Legacy fallback origin when `ALLOWED_ORIGINS` is empty (default `http://localhost:8080`) |
| `SUPABASE_URL`                                | **yes**  | Fail-fast at boot                                                                        |
| `SUPABASE_SERVICE_ROLE_KEY`                   | **yes**  | Fail-fast at boot — treat as a secret                                                    |
| `JWT_SECRET`                                  | **yes**  | ≥ 32 chars, e.g. `openssl rand -base64 48` — treat as a secret                           |
| `ADMIN_EMAIL`                                 | no       | Default `admin@ethioexchange.dev`                                                        |
| `ADMIN_PASSWORD`                              | **yes**  | ≥ 12 chars with upper + lower + digit + special — fail-fast at boot                      |
| `OPENAPI_SERVER_URL`                          | no       | Public API base URL shown in `/docs`; production falls back to the Render URL            |
| `JWT_EXPIRES_IN` / `REFRESH_TOKEN_EXPIRES_IN` | no       | Token lifetimes (`15m` / `30d`)                                                          |
| `LOG_LEVEL`                                   | no       | `info` recommended in production                                                         |

\* `ALLOWED_ORIGINS` has no default; when unset it falls back to `FRONTEND_URL` (default `http://localhost:8080`). In production set it to your deployed frontend origin, e.g. `https://ethioexchangehub.vercel.app`.

## Build & run

```sh
# 1. Build the image
docker build -t ethio-exchange-backend:latest ./backend

# 2. Run with environment variables
docker run -d --name ethio-exchange-backend \
  --restart unless-stopped \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -e SUPABASE_URL=https://your-project.supabase.co \
  -e SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  -e JWT_SECRET='a-long-random-secret-at-least-32-chars' \
  -e ADMIN_PASSWORD='change-me-Str0ng!' \
  -e ALLOWED_ORIGINS='https://ethioexchangehub.vercel.app' \
  ethio-exchange-backend:latest
```

### Docker Compose

```sh
# Plain backend
docker compose up --build -d backend

# With the optional nginx reverse proxy
docker compose --profile nginx up --build -d
```

The compose file includes a healthcheck that probes `GET /ready`.

## Reverse proxy (nginx)

Example `server` block — place under `/etc/nginx/conf.d/` (see `docker/nginx.conf`):

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-ID $request_id;
    }
}
```

### HTTPS recommendations

- Terminate TLS at the proxy with a certificate from **Let's Encrypt** (certbot).
- Redirect `http → https` (301) and enable HSTS (`add_header Strict-Transport-Security "max-age=31536000"`).
- Keep the backend listening on a private interface / Docker network; do **not** expose `:5000` publicly.
- Set `proxy_read_timeout` to a sane value (e.g. `60s`) for slow client connections.

## Health checks

| Probe         | Purpose                       | Response                              |
| ------------- | ----------------------------- | ------------------------------------- |
| `GET /live`   | Liveness — process up         | 200 always while running (no DB call) |
| `GET /ready`  | Readiness — can serve traffic | 200 when DB reachable, else 503       |
| `GET /health` | Full health incl. DB          | 200 / 503                             |

Use `/live` for container/K8s liveness, `/ready` for readiness (routing traffic),
and `/health` for external monitoring dashboards.

## Rolling deployment & zero-downtime restart

The server handles `SIGTERM`/`SIGINT` gracefully: it stops accepting new
requests, lets in-flight requests finish, logs, then exits 0.

**Docker Compose (single node):**

```sh
docker compose build backend
docker compose up -d --no-deps backend   # recreate in place
```

**Rolling (multi-node / K8s-style):**

1. Build and push the new image to your registry.
2. Drain one instance at a time: remove it from the load balancer, wait for
   in-flight requests to drain (the grace period), restart with the new image.
3. Wait for `GET /ready` to return 200 before re-adding to the pool.
4. Repeat for remaining instances.

**Zero-downtime restart of a single container:**

```sh
docker compose up -d --build --no-deps backend
# Healthcheck gates traffic: only healthy containers serve requests.
```

If you run the container directly, send `SIGTERM` (the container's PID 1 is
`node`), not `docker kill` (SIGKILL), to trigger graceful shutdown.

## Verification after deploy

```sh
curl -i http://localhost:5000/live      # 200 {"success":true,"data":{"alive":true}}
curl -i http://localhost:5000/ready     # 200 when DB reachable
curl -i http://localhost:5000/health    # 200 {"server":"OK","database":"Connected"}
curl -i http://localhost:5000/metrics   # Prometheus text
curl -i http://localhost:5000/docs      # Swagger UI
```

## Monitoring & alerting

See [MONITORING.md](./MONITORING.md) for Prometheus scraping, Grafana, and
alert rules. See [RUNBOOK.md](../RUNBOOK.md) for incident response.
