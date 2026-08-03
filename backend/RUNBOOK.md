# Operations Runbook

Runbook for operating the Ethio Exchange Hub backend in production.

**Probes:** `GET /live` (liveness) · `GET /ready` (readiness) · `GET /health` (health)
**Metrics:** `GET /metrics` (Prometheus) · **Docs:** Swagger UI at `/docs`
**Logs:** stdout/stderr, structured, with `requestId` correlation

Every incident: capture the `X-Request-ID`, the timestamp, and the log lines
before acting.

---

## 1. Server won't start

**Symptoms:** container exits immediately; `docker compose ps` shows
`Exit (1)`; no listening socket.

**Checks:**

1. `docker compose logs backend --tail 100` — read the boot error.
2. Verify env: the app **fails fast** on missing/invalid required variables
   with a readable message. Check `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `JWT_SECRET` are present and valid.
3. Check the port is free: `ss -ltnp | grep :5000`.
4. Run locally: `cd backend && npm run dev` to reproduce with full logs.

**Resolution:**

- Fix the env var and restart (`docker compose up -d --force-recreate backend`).
- If the image is stale, rebuild: `docker compose build backend`.
- Port conflict → change `PORT` or stop the other process.

---

## 2. Database unavailable

**Symptoms:** `GET /ready` → 503; `GET /health` → 503
`{"message":"Database connection failed."}`; 500s on API routes; logs show
`DATABASE_ERROR` wrapped with a sanitized cause.

**Checks:**

1. `curl -i /ready` and `/health` to confirm scope (whole DB vs one query).
2. Supabase status page + project dashboard (project paused? over quota?
   network outage?).
3. `docker compose logs backend --tail 200 | grep -i database` for the wrapped
   cause (e.g. `PGRST116`, `connection refused`, `timeout`).
4. Check service-role key rotation — a rotated key breaks the client.

**Resolution:**

- If the project was **paused** (free tier), resume it from the dashboard.
- Wrong/rotated key → update `SUPABASE_SERVICE_ROLE_KEY`, recreate the
  container.
- Network issue → restore connectivity; the app recovers automatically
  (client reconnects per request) — no app restart needed.
- **App stays up**: `/live` still returns 200 (no DB call) so orchestrators
  don't kill a healthy process; `/ready` gates traffic.

---

## 3. High latency

**Symptoms:** p95 response time elevated (see MONITORING.md queries); users
report slowness.

**Checks:**

1. `GET /metrics` — `http_request_duration_seconds` histogram per route.
2. Event-loop lag: `nodejs_eventloop_lag_seconds` — if high, the event loop is
   blocked (synchronous work, huge payloads).
3. Heap: `nodejs_heap_size_used_bytes / total` — GC pressure.
4. DB: `GET /ready` still 200? Check Supabase dashboard for slow queries.
5. `docker compose logs` — look for slow access lines (high `:response-time`).

**Resolution:**

- Event-loop blocked → look for synchronous CPU work in hot paths; profile;
  defer heavy work off the loop.
- Memory/GC pressure → see incident #4 (memory leak).
- Slow DB queries → add indexes / optimize; rate limits on scraping.
- Deploy a fix with a rolling restart (see DEPLOYMENT.md).

---

## 4. Memory leak

**Symptoms:** `nodejs_heap_size_used_bytes` grows monotonically; RSS climbs;
OOM-kill by the container runtime.

**Checks:**

1. Plot heap vs RSS over time from Prometheus.
2. `docker stats ethio-exchange-backend` — live RSS.
3. Check for unbounded caches, retained request scopes, growing in-memory
   collections (e.g. the Supabase client, scraped data held in memory).

**Resolution:**

- Identify the retaining structure via a heap snapshot (e.g. `node --inspect`
  - Chrome DevTools heap profile in a staging replica).
- Fix and deploy via rolling restart.
- Immediate relief: restart the container (graceful `SIGTERM`) to reclaim
  memory; add `mem_limit` to the container so OOM-kills are contained.

---

## 5. CPU spikes

**Symptoms:** `process_cpu_seconds_total` climbing; container throttled;
latency spikes.

**Checks:**

1. Which route is hot? `rate(http_requests_total[5m]) by (route)`.
2. Are scrapes/background work running at the wrong time?
3. `docker stats` for container-level CPU.

**Resolution:**

- Abuse/traffic spike → add rate limiting (see SECURITY.md), scale out, or
  enable caching behind the proxy.
- Expensive query → optimize/index.
- If a single request type dominates, consider caching its response.

---

## 6. Health endpoint failures

**Symptom pattern** — treat `/live`, `/ready`, `/health` separately:

| Probe     | 5xx     | Meaning                                                         |
| --------- | ------- | --------------------------------------------------------------- |
| `/live`   | 503/500 | Process unhealthy → restart container                           |
| `/ready`  | 503     | Process fine, DB down → do NOT route traffic; don't restart app |
| `/health` | 503     | Same as ready + external visibility                             |

**Checks:**

1. Confirm which probe fails and with what body.
2. `/live` failing → process-level issue: restart (`docker compose restart backend`).
3. `/ready`/`/health` failing → DB issue → incident #2.
4. `/metrics` failing → registry render error (rare); check logs for
   "Failed to render metrics".

---

## 7. Deployment rollback

**Symptom:** post-deploy regression (errors, high latency, bad data).

**Checks:**

1. Compare `GET /docs.json` `info.version` (or image tag) with the previous
   known-good version.
2. Review deploy-time logs for the first error.

**Rollback — Docker Compose:**

```sh
# 1. Tag the previous known-good image (if tagged):
docker compose up -d --no-deps backend=<registry>/ethio-exchange-backend:previous-tag

# Or rebuild from the previous commit:
git checkout <previous-tag>
docker compose build backend
docker compose up -d --no-deps backend
```

**Rollback — general:**

1. Point the load balancer at the previous image (keep the new one for
   debugging).
2. Wait for `/ready` 200 before sending traffic.
3. If DB schema changed, roll the DB back with the app (see
   BACKUP_AND_RECOVERY.md) — or keep the new app on the new schema if
   backward-compatible.
4. Post-incident: write the root cause into this runbook.

---

## Escalation

- Include the `X-Request-ID` of failing requests in every handoff.
- Time-boxed actions: 15 min diagnosis → 30 min mitigation → escalate if the
  DB or public API is unavailable.
