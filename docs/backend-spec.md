# Ethio Exchange — Backend Technical Specification

**Status:** v1.0 — Final approved backend blueprint (pre-Phase 1)
**Scope:** Frontend contract analysis, database schema, rate-resolution & freshness policy, backend architecture, REST API specification, authentication flow, error formats, schema changes.
**Constraint:** This document specifies the design. No implementation code is included.

---

## 1. Executive Summary

The frontend (React 19 + Vite 8 + TanStack Query + axios) is fully built and defines a **strict data contract** the backend must satisfy. The workspace contains **no backend and no SQL files** — the schema is designed here from the frontend types in `src/types/*` and mock data in `src/mocks/*`.

This v1.0 revision incorporates the **final specification review** and is the **approved backend blueprint** before Phase 1 implementation begins.

### Binding decisions (final specification review + confirmed envelope)

1. **`bank_id` is the relationship everywhere.** All name-based relationships are replaced by `bank_id` foreign keys. Bank names are **never** used for joins or relations — they are resolved from `bank_id` **only in API responses** (the frontend still receives `bankName` for display).
2. **Current rates are separated from historical rates.** `exchange_rates` holds the **latest snapshot only** (UNIQUE `(bank_id, currency)`); all history moves to the append-only `exchange_rate_history` table.
3. **A `scrapers` table** manages scraper metadata (`id, bank_id, name, enabled, status, last_run, next_run`).
4. **Exchange-rate priority rules are documented** (§4.1): manual overrides scraper → else latest scraper → else the bank is absent from public APIs.
5. **A freshness policy is defined** (§4.2): rates older than the configured threshold (default **24 h**) are ignored; manual rates are exempt.
6. **New endpoint `GET /api/v1/system/status`** (§6.4) reports API health, DB health, scraper status, last scrape time, and version.
7. **A new `audit_logs` table** records administrative and system actions (login/logout, manual-rate CRUD, settings changes, scraper runs).
8. **All routes are prefixed with `/api/v1`** (see §6 path convention).
9. **Envelope (CONFIRMED — keep):** every endpoint returns `{ "success": true, "message": "...", "data": ... }`. This matches `src/lib/api/client.ts`, which only unwraps that shape. The workspace Express backend ("exchange plat") currently responds `{ status, data }` — it must be adapted to the envelope, or `client.ts` extended. **BLOCKING:** do not flip `VITE_USE_MOCKS=false` until resolved.

---

## 2. Frontend Architecture Analysis (what the backend must serve)

| Layer | Detail |
|---|---|
| Framework | React 19, React Router 7, TanStack Query 5 |
| HTTP | axios; base URL from `VITE_API_BASE_URL` (default `http://localhost:5000/api/v1`) |
| Timeout | 15,000 ms (`VITE_API_TIMEOUT_MS`) |
| Envelope | `{ success: boolean, message: string, data: T }` — unwrapped by the response interceptor |
| Auth | JWT bearer; access token in `localStorage` (`ethio-exchange.access-token` / `.refresh-token`) |
| 401 handling | single-flight `POST /auth/refresh`, replay original request once; on failure → clear tokens → dispatch `auth:session-expired` → redirect to `/admin/login` |
| Errors | `ApiError` with `status`; client maps timeouts, 401, 403, 404, 5xx to friendly messages |
| Roles | `admin`, `super_admin` (`ADMIN_ROLES` in `src/types/auth.ts`) |
| Query keys | `/exchange-rates`, `/banks`, `/currencies`, `/news`, `/news/categories`, `/market-ticker`, `/admin/*` |

### Data contract (shapes the API must return — camelCase field names are mandatory; fields marked with a trailing `*` (e.g. `bio*`) are additions recommended by this spec)

- **ExchangeRate:** `{ id, bankId, bankName, currency, cashBuying, cashSelling, transactionBuying, transactionSelling, lastUpdated (ISO), source, logo }`
  - `source` is typed `"scraper" | "manual" | (string & {})` — **open-ended**, so do not over-constrain the DB enum. In practice the resolved public record reports `source` as `"manual"` when a manual rate overrides, else `"scraper"`.
  - The API returns **one resolved record per (bank, currency)** (the result of the priority rule + freshness filter, §4). `bankName` is resolved from `bank_id` server-side.
  - The frontend's `dedupeLatestRates` becomes a no-op once the API returns one record per pair — the intended design.
- **Bank:** `{ slug, name, short, type: "State Owned"|"Private Bank", color (Tailwind class), established?, description?, phone?, email?, hq?, rating?, reviews?, branches? }`
  - `Bank` contains **no rate fields**. The backend joins rates by `bank_id` and resolves `bankName` into each rate record.
  - **Response constraint (for the current frontend):** `banks.$slug.tsx` and `banks.tsx` filter rates by comparing `bank.name` to `r.bankName` client-side. Therefore `bankName` in `/exchange-rates` must **exactly match** `banks.name` (trim + lowercase) even though the backend relation is `bank_id`.
  - Public `/banks` lists **only banks that currently have a resolved rate** (priority rule + freshness, §4).
- **Currency:** `{ code, label, category }`
- **NewsItem:** `{ id, title, excerpt, category, date, readMinutes, image, featured?, author?, authorRole?, authorAvatar? }`
- **NewsCategory:** `{ name, count }` — `count` is effectively unused by the UI (counts are computed client-side from `/news`); keep for completeness.
- **MarketTickerItem:** `{ pair, value, change }` — derived from resolved rates.
- **DashboardStat:** `{ label, value, delta, direction: "up"|"down"|"neutral" }` — `value` and `delta` are **strings**.
- **RateTrendPoint:** `{ label, cashBuying, cashSelling }` — sourced from `exchange_rate_history`.
- **ManualRate:** `RateRecord + { id }` where `RateRecord = { bankId, bankName, currency, cashBuying, cashSelling, transactionBuying, transactionSelling, lastUpdated, source }` — `bankName` is resolved from `bankId` in responses.
- **ScraperHealth:** `{ id, name, bank, status: "healthy"|"degraded"|"offline", successRate, lastRun, nextRun, records, avgDurationMs }` — `name`/`bank` resolved from `scrapers` + `banks`.
- **ScrapeLog:** `{ id, timestamp, scraper, bank, status: "success"|"warning"|"error", records, durationMs, message }` — `scraper`/`bank` resolved from FKs.
- **AdminProfile:** `{ name, email, role, initials, memberSince, lastLogin, bio* }` — *proposed* addition: the profile edit form edits a `bio`, so the type should include it.
- **AdminSettings:** `{ siteName, defaultCurrency, refreshInterval, timezone, retentionDays, freshnessHours*, emailAlerts, failureAlerts, dailyDigest, weeklyReport }` — `freshnessHours*` is added to expose the freshness threshold (§4).
- **AuthUser:** `{ id, name, email, role, avatarUrl? }`
- **AuthTokens:** `{ accessToken, refreshToken }`
- **AuthSession:** `{ tokens: AuthTokens, user: AuthUser }`

---

## 3. Database Schema

> ⚠️ No schema files exist in this workspace. The schema below is the **target schema** designed from the frontend contract and the final specification review. It supersedes any inferred "existing" shapes.

### `banks`
`id` PK · `slug` UNIQUE · `name` · `short` · `type` · `color` · `established` · `description` · `phone` · `email` · `hq` · `rating` · `reviews` · `branches` · `logo` · `created_at` · `updated_at`.
All other tables reference `banks.id` via `bank_id`.

### `exchange_rates` — LATEST SNAPSHOT ONLY
`id` PK · `bank_id` FK → banks **NOT NULL** · `currency` · `cash_buying` · `cash_selling` · `transaction_buying` · `transaction_selling` · `source` (`'scraper'` in practice) · `last_updated` · `created_at`.
**UNIQUE (`bank_id`, `currency`)** — one current record per pair. Scraper workers **upsert** into this table; superseded values move to `exchange_rate_history`.

### `exchange_rate_history` — NEW (append-only)
`id` PK · `bank_id` FK → banks · `currency` · `cash_buying` · `cash_selling` · `transaction_buying` · `transaction_selling` · `source` · `recorded_at` · `created_at`.
Index on (`bank_id`, `currency`, `recorded_at`). Powered by the same scraper runs and manual-rate writes; feeds `rate-trend` and audit.

### `manual_rates`
`id` PK · `bank_id` FK → banks **NOT NULL** · `currency` · `cash_buying` · `cash_selling` · `transaction_buying` · `transaction_selling` · `source = 'manual'` · `last_updated` · `created_by` FK → users · `created_at` · `updated_at`.
**UNIQUE (`bank_id`, `currency`)** — one manual rate per pair (enables the override rule cleanly, §4). Names are **never** stored; `bankName` is resolved in responses.

### `scrapers` — NEW (scraper metadata)
`id` PK · `bank_id` FK → banks **NOT NULL** · `name` · `enabled` BOOL default `true` · `status` (`'healthy'|'degraded'|'offline'`) · `last_run` timestamptz · `next_run` timestamptz · `created_at` · `updated_at`.
One row per scraper (the mocks imply ~7). Schedule + enable/disable + health live here.

### `scraper_health` — scraper operational stats
`id` PK · `scraper_id` FK → scrapers **UNIQUE** · `success_rate` · `records` · `avg_duration_ms` · `updated_at`.
(`status`, `last_run`, `next_run` live on `scrapers`; `name`/`bank` are resolved via joins.)
These three stats are **aggregated from recent `scrape_logs` rows** per scraper (success rate = successful runs / total runs over the retention window; records/duration = averages) rather than stored per-run values.

### `scrape_logs`
`id` PK · `scraper_id` FK → scrapers **NOT NULL** · `timestamp` · `status` (`'success'|'warning'|'error'`) · `records` · `duration_ms` · `message` · `created_at`.
`bank` is derivable through `scrapers.bank_id`; no denormalized name strings.

### `audit_logs` — NEW
`id` PK · `actor_user_id` FK → users (nullable — system actions have no actor) · `action` (e.g. `'login'`, `'logout'`, `'manual_rate.create'`, `'manual_rate.update'`, `'manual_rate.delete'`, `'settings.update'`, `'scraper.run'`, `'scraper.run_all'`, `'reset_demo_data'`) · `entity_type` (e.g. `'manual_rate'`, `'settings'`, `'scraper'`) · `entity_id` · `metadata` JSONB (before/after snapshots, request ids) · `ip_address` · `created_at`.
Index on (`actor_user_id`, `created_at`) and (`entity_type`, `entity_id`). Written by the auth middleware (login/logout) and the admin service (mutations); read-only for now (no admin UI page planned in Phase 1).

### Auth & content tables (unchanged from review)
- `users` (id, name, email UNIQUE, password_hash, role, avatar_url, last_login_at, timestamps)
- `refresh_tokens` (id, user_id FK, token_hash, expires_at, revoked_at, replaced_by, created_at)
- `password_reset_tokens` (id, user_id FK, token_hash, expires_at, used_at, created_at)
- `currencies` (code PK, label, category)
- `news_articles` (id, title, excerpt, category, date, read_minutes, image, featured, author, author_role, author_avatar, created_at)
- `settings` (singleton: site_name, default_currency, refresh_interval, timezone, retention_days, **freshness_hours**, email_alerts, failure_alerts, daily_digest, weekly_report, updated_at)

---

## 4. Exchange Rate Priority & Data Freshness Policy

### 4.1 Resolution rule (authoritative)

For every (bank, currency) pair, the **resolved rate** served by public APIs is determined in this order:

1. **If a manual rate exists** in `manual_rates` → it **overrides** the scraper rate. `source = "manual"`.
2. **Otherwise, if a scraper rate exists** in `exchange_rates` (and is fresh per §4.2) → the latest scraper rate. `source = "scraper"`.
3. **Otherwise (neither exists, or the scraper rate is stale)** → the bank has **no rate for that currency** and **must not appear in public APIs** for it.

Consequences:
- `/exchange-rates` returns only resolved records (one per pair).
- `/banks` lists only banks that have at least one resolved rate.
- `/market-ticker` and ranking surfaces are derived from resolved rates only.

### 4.2 Freshness policy

- Rates whose `last_updated` is **older than the configured freshness threshold** are treated as absent.
- **Default threshold: 24 hours**, configurable via `settings.freshness_hours` (exposed to the admin settings UI as `freshnessHours`).
- A bank whose scraper rate goes stale **drops out of public APIs** until a fresh rate is written (or a manual rate covers it).
- **Manual rates are exempt** from the freshness filter — they are deliberate human overrides and remain until changed or deleted.
- The stale/fresh boundary is evaluated at query time (no background purge required for correctness; retention remains governed by `settings.retention_days`).

---

## 5. Backend Architecture Design

**Recommended stack** (matches existing workspace decisions — Express + Supabase/Postgres + TypeScript; `zod` is already a frontend dependency and should be shared):

```
┌─────────────────────────────────────────────────────────────┐
│  Public clients (React SPA)  ──  Admin clients (React SPA)   │
└──────────────┬──────────────────────────────┬───────────────┘
               │ HTTPS + JSON envelope        │ Bearer JWT
┌──────────────▼──────────────────────────────▼───────────────┐
│                 Express API (TypeScript)                     │
│  routes (/api/v1/*) → zod validation → controllers →          │
│  services → repositories                                     │
│  middleware: envelope, auth (JWT), roles, rate-limit, error,  │
│              audit                                           │
│  services: RateResolution, Freshness, ScraperRegistry,        │
│            SystemStatus, Auth, Audit                         │
└──────┬───────────────────────────────┬───────────────────────┘
       │                              │
┌──────▼──────────┐          ┌────────▼──────────┐
│  Supabase/Postgres │          │  Scraper workers  │
│  (single source of  │          │  (cron / BullMQ)  │
│   truth)            │◄─────────│  upsert exchange_rates,
└────────────────────┘          │  append history/logs,
                               │  update scrapers
                               └────────────────────┘
```

- **API layer:** Express + TypeScript, organized `routes/ → controllers/ → services/ → repositories/`, all mounted under the `/api/v1` prefix.
- **Rate resolution:** a `RateResolution` service applies the §4 priority rule + freshness filter for every public read; `bankName`/`logo` are resolved from `bank_id` here.
- **Audit:** an `Audit` service/middleware writes to `audit_logs` for auth events and admin mutations.
- **Validation:** zod schemas shared with the frontend package (same field names).
- **Caching:** in-memory TTL (or Redis) for public endpoints (`exchange-rates`, `banks`, `market-ticker`); invalidate on scraper write or manual-rate change.
- **Background jobs:** a scheduler iterates enabled `scrapers` rows; each run upserts `exchange_rates`, appends `exchange_rate_history` + `scrape_logs`, and updates `scrapers.last_run/next_run` and `scraper_health`.
- **Auth:** stateless JWT access tokens + DB-backed (revocable) refresh tokens.

---

## 6. REST API Specification

All responses use the envelope `{ "success": true, "message": string, "data": T }` (confirmed by the final specification review). Errors use the format in §8.

**Path convention (BINDING):** every route is prefixed with **`/api/v1`** (e.g. `GET /api/v1/exchange-rates`). The frontend achieves this by setting `VITE_API_BASE_URL` to `http://localhost:5000/api/v1` — its relative paths (`/exchange-rates`, `/banks`, `/auth/login`, `/admin/...`) then map to `/api/v1/...` with **no frontend path changes** (only the env var). This document writes full paths including the prefix.

### 6.1 Public endpoints (no auth)

| # | Method | Path | Query/Body | Success → `data` |
|---|---|---|---|---|
| 1 | GET | `/api/v1/exchange-rates` | `?currency=USD` (optional) | `ExchangeRate[]` — one **resolved** record per (bank, currency) per §4 |
| 2 | GET | `/api/v1/banks` | — | `Bank[]` — banks with ≥1 resolved rate only (no rate fields) |
| 3 | GET | `/api/v1/banks/:slug` | path | `Bank` · **404** if not found or has no resolved rate |
| 4 | GET | `/api/v1/currencies` | — | `Currency[]` |
| 5 | GET | `/api/v1/news` | — | `NewsItem[]` |
| 6 | GET | `/api/v1/news/categories` | — | `NewsCategory[]` |
| 7 | GET | `/api/v1/market-ticker` | — | `MarketTickerItem[]` (from resolved rates) |

**Example (note `source: "manual"` — the manual rate overrides the scraper rate):**

```
GET /api/v1/exchange-rates?currency=USD
200 → { "success": true, "message": "OK",
        "data": [ { "id": 42, "bankId": 1, "bankName": "Awash Bank", "currency": "USD",
                    "cashBuying": 129.51, "cashSelling": 130.72,
                    "transactionBuying": 129.9, "transactionSelling": 130.35,
                    "lastUpdated": "2026-08-01T09:00:00.000Z", "source": "manual", "logo": "" } ] }

GET /api/v1/banks/awash-bank
200 → { "success": true, "message": "OK", "data": { "slug": "awash-bank", "name": "Awash Bank",
        "short": "AW", "type": "Private Bank", "color": "bg-red-500", ... } }
404 → { "success": false, "message": "Bank not found.", "data": null }
```

**Deliberately NOT part of the API** (verified against the frontend): there is no per-bank rates route (e.g. `/banks/:slug/rates`) — `banks.$slug.tsx` loads all rates and filters client-side.

### 6.2 Auth endpoints (no auth, except logout)

| # | Method | Path | Body | Success → `data` |
|---|---|---|---|---|
| 8 | POST | `/api/v1/auth/login` | `{ email, password }` | `AuthSession` (`{ tokens: AuthTokens, user: AuthUser }`) |
| 9 | POST | `/api/v1/auth/refresh` | `{ refreshToken }` | `AuthTokens` |
| 10 | POST | `/api/v1/auth/logout` | — (Bearer) | `null` / 204 |
| 11 | GET | `/api/v1/auth/me` | — (Bearer) | `AuthUser` |
| 12 | POST | `/api/v1/auth/forgot-password` | `{ email }` | `null` (always 200 — anti-enumeration) |
| 13 | POST | `/api/v1/auth/reset-password` | `{ token, password }` | `null` |

**Example:**

```
POST /api/v1/auth/login
{ "email": "admin@ethioexchange.dev", "password": "••••••••" }
200 → { "success": true, "message": "Signed in.",
        "data": { "tokens": { "accessToken": "<jwt>", "refreshToken": "<jwt>" },
                  "user": { "id": 1, "name": "Ethio Exchange Admin",
                            "email": "admin@ethioexchange.dev", "role": "super_admin" } } }
401 → { "success": false, "message": "Invalid email or password.", "data": null }
```

Note: the reset-password page reads `token` from the URL query (`?token=`), validates `password.length >= 8` client-side, and errors when the token param is missing. Login errors surface `ApiError.message` directly in the UI — so `/auth/login` failures should return readable envelope messages.

### 6.3 Admin endpoints (Bearer + role `admin`|`super_admin`)

Existing GET stubs (paths fixed by `src/lib/api/admin.ts` — relative paths resolve against the `/api/v1` base):

| # | Method | Path | Success → `data` |
|---|---|---|---|
| 14 | GET | `/api/v1/admin/dashboard` | `DashboardStat[]` |
| 15 | GET | `/api/v1/admin/dashboard/rate-trend` | `RateTrendPoint[]` (7 days USD, from `exchange_rate_history`) |
| 16 | GET | `/api/v1/admin/manual-rates` | `ManualRate[]` (`bankName` resolved from `bankId`) |
| 17 | GET | `/api/v1/admin/scrape-logs` | `ScrapeLog[]` (`scraper`/`bank` resolved) |
| 18 | GET | `/api/v1/admin/scraper-health` | `ScraperHealth[]` (from `scrapers` + `scraper_health`) |
| 19 | GET | `/api/v1/admin/profile` | `AdminProfile` |
| 20 | GET | `/api/v1/admin/settings` | `AdminSettings` (incl. `freshnessHours*`) |

New mutation endpoints required by the existing UI:

| # | Method | Path | Body | Success → `data` |
|---|---|---|---|---|
| 21 | POST | `/api/v1/admin/manual-rates` | `{ bankId, currency, cashBuying, cashSelling, transactionBuying, transactionSelling }` (no `id`, no `lastUpdated` — server stamps) | `ManualRate` · **409** if (bank, currency) exists |
| 22 | PUT | `/api/v1/admin/manual-rates/:id` | partial `ManualRate` fields (uses `bankId`) | `ManualRate` |
| 23 | DELETE | `/api/v1/admin/manual-rates/:id` | — | `null` (204) |
| 24 | PUT | `/api/v1/admin/settings` | `AdminSettings` fields (incl. `freshnessHours*`) | `AdminSettings` |
| 25 | PUT | `/api/v1/admin/profile` | `{ name, email, bio* }` | `AdminProfile` |
| 26 | POST | `/api/v1/admin/scrapers/run-all` | — | `{ triggered: true }` |
| 27 | POST | `/api/v1/admin/settings/reset-demo-data` | — | `null` |

> **Request bodies use `bankId`, never `bankName`** (binding decision). The current frontend mock form (`manual-rates.tsx`) posts `bankName`; Phase 1 updates the wiring to send `bankId` (bank select options resolve to ids). Responses always resolve and include `bankName`.
>
> Note: the frontend's `parseRateForm` currently sets `id: Date.now()` and `lastUpdated` client-side for the local mock flow. Once wired to the API, the client will stop sending these and rely on the server-stamped values.

Notes:
- All admin mutations are **frontend-local today** (only GET stubs exist in `src/lib/api/admin.ts`); the mutation wiring is Phase 1 work after the backend ships.
- A manual-rate write also appends a row to `exchange_rate_history` (source `manual`) so trends/audit capture overrides.
- Every admin mutation and auth event (login/logout) writes an `audit_logs` row (§3).

### 6.4 System endpoint (no auth)

| # | Method | Path | Query/Body | Success → `data` |
|---|---|---|---|---|
| 28 | GET | `/api/v1/system/status` | — | `SystemStatus` (below) |

**`SystemStatus` shape:**

```json
{
  "status": "ok" | "degraded" | "down",
  "api":    { "healthy": true, "version": "1.0.0", "uptimeSeconds": 86400 },
  "database": { "healthy": true, "latencyMs": 12 },
  "scrapers": {
    "total": 7, "enabled": 7, "healthy": 6, "degraded": 0, "offline": 1,
    "lastRun": "2026-08-01T08:55:00.000Z"
  },
  "lastScrape": { "at": "2026-08-01T08:55:00.000Z", "status": "success", "records": 412 },
  "version": { "api": "1.0.0", "schema": 3, "environment": "production" }
}
```

Semantics: overall `status` is `"ok"` when API + DB are healthy and ≥1 scraper is healthy; `"degraded"` when the API/DB are healthy but scrapers are degraded/offline; `"down"` when the API or DB is unhealthy. The endpoint returns **200** with the degraded/ok status in the payload (monitoring may also read HTTP 503 when `status === "down"` — see §8).

---

## 7. Authentication Flow

1. **Login** — `POST /api/v1/auth/login` validates credentials → returns access token (JWT, short-lived, **15 min**) + refresh token (**30 days**, stored **hashed** in DB with `expires_at`); writes an `audit_logs` row.
2. **Boot / session restore** — if an access token exists, the frontend calls `GET /api/v1/auth/me` → sets the user; on 401 the interceptor refreshes.
3. **Request auth** — every request sends `Authorization: Bearer <accessToken>`; middleware verifies the JWT → attaches the user; `RequireRole` checks `role ∈ {admin, super_admin}`.
4. **Expiry & refresh** — on 401, the frontend calls `POST /api/v1/auth/refresh` (single-flight, one concurrent call) → new token pair → replays the original request. **Refresh rotation:** the old refresh token is revoked/replaced.
5. **Refresh failure** — tokens cleared, `auth:session-expired` event fires, the frontend redirects to `/admin/login?from=...`.
6. **Logout** — `POST /api/v1/auth/logout` revokes the refresh token server-side; the frontend clears localStorage; an `audit_logs` row is written.
7. **Password reset** — `forgot-password` creates a single-use, expiring (1 h) token → emailed link → `reset-password` verifies, re-hashes, revokes all sessions.

---

## 8. Error Response Format

Single canonical shape (matches `client.ts` normalization):

```json
{ "success": false, "message": "Human-readable reason", "data": null }
```

Validation errors may add a `fieldErrors` map (the frontend ignores extra keys safely):

```json
{ "success": false, "message": "Validation failed.",
  "data": null,
  "fieldErrors": { "cashBuying": ["Must be a positive number."] } }
```

| Status | Meaning | Message guidance |
|---|---|---|
| 400 | Malformed request / bad input | specific |
| 401 | Missing/expired/invalid token | `Your session has expired. Please sign in again.` |
| 403 | Authenticated but wrong role | `You do not have permission to perform this action.` |
| 404 | Resource not found | `The requested resource was not found.` |
| 409 | Duplicate (bank+currency manual rate) | specific |
| 422 | Validation failed | specific |
| 429 | Rate limited | `Too many requests. Please try again later.` |
| 500 | Server error | `The server encountered an error. Please try again later.` |
| 503 | Service unavailable (API/DB down) — used by `/api/v1/system/status` when `status === "down"` | specific |

Client mapping in `client.ts` for reference: timeouts (`ECONNABORTED`) → "The request timed out...", 401 → "Your session has expired...", 403 → permission message, 404 → not-found message, 5xx → server-error message.

---

## 9. Schema Changes Required (from legacy/inferred state → target)

1. **Envelope reconciliation (non-DB, BLOCKING):** adapt the existing Express backend from `{ status, data }` to `{ success, message, data }` (or extend `client.ts`). Do this before flipping `VITE_USE_MOCKS=false`.
2. **`exchange_rates` → latest snapshot only:** add UNIQUE `(bank_id, currency)`; convert any stored history rows into the new `exchange_rate_history` table.
3. **New `exchange_rate_history` table** (append-only) — feeds `rate-trend` and audit.
4. **`manual_rates.bankName` → `bank_id` FK:** drop the name string; add `bank_id` FK → banks, UNIQUE `(bank_id, currency)`, and `created_by` FK → users. Resolve `bankName` only in responses.
5. **New `scrapers` table:** `id, bank_id FK, name, enabled, status, last_run, next_run` — scraper metadata moves here.
6. **`scraper_health`:** key by `scraper_id` FK → scrapers (UNIQUE), keep operational stats (`success_rate`, `records`, `avg_duration_ms`); drop `name`/`bank` strings (resolved via joins).
7. **`scrape_logs`:** replace `scraper`/`bank` strings with `scraper_id` FK → scrapers.
8. **New `audit_logs` table:** `actor_user_id` FK → users (nullable), `action`, `entity_type`, `entity_id`, `metadata` JSONB, `ip_address`, `created_at`.
9. **Auth tables:** `users`, `refresh_tokens`, `password_reset_tokens`.
10. **Content tables:** `currencies`, `news_articles`, `settings` (add `freshness_hours`).
11. **`banks`:** add `logo` column.
12. **Rate priority enforcement:** the `RateResolution` service (not the DB) applies §4; public endpoints filter banks with no resolved rate.
13. **Route prefix:** mount all routes under `/api/v1`; set `VITE_API_BASE_URL=http://localhost:5000/api/v1` in the frontend `.env`. **Action in Phase 1:** update `.env.example` from `http://localhost:5000/api` to `http://localhost:5000/api/v1` (and the local `.env`), otherwise every route 404s.

---

## 10. Open Questions for Review (remaining)

1. **Supabase vs plain Postgres** — the `.env.example` comment implies Supabase; confirm the DB host and whether to use Supabase Auth or custom JWT.
2. **Password reset delivery** — which email provider (SMTP/resend/SendGrid) for reset links and alert digests?
3. **Freshness threshold value** — default 24 h proposed; confirm the exact default and whether it should vary per bank/currency.
4. **`/api/v1/system/status` auth** — proposed public (no auth) for monitoring; confirm, or restrict to admin.
5. **HTTP 503 on `/api/v1/system/status`** — return 200 with `status:"down"` in payload, or also use HTTP 503? Proposed: 200 always (payload carries state), 503 optional for load-balancer health checks.
6. **Audit log retention** — how long to keep `audit_logs` rows (proposed: tie to `settings.retention_days`, default 90 days)?

---

## Appendix A — Review verification notes

The spec above was fact-checked against the frontend code. Verified correct:
- Endpoint paths in `src/lib/api/*` match §6, with all routes prefixed `/api/v1` (frontend reaches them via `VITE_API_BASE_URL=http://localhost:5000/api/v1`; its relative paths require no code changes).
- Response type shapes match `src/types/*`.
- Envelope `{ success, message, data }` and the 401 single-flight refresh flow match `src/lib/api/client.ts`.
- Auth endpoints match `src/lib/api/auth.ts`; `token` arrives via `?token=` query param on the reset page.
- Proposed mutation endpoints are genuinely implied by the UI in `src/routes/admin/*` (currently local-only, toasts).
- `Bank` has no rate fields; **backend relations use `bank_id`** — but `bankName` in rate responses must exactly match `banks.name` because `banks.tsx`/`banks.$slug.tsx` filter by name client-side.
- `RateSource` is open-ended (`"scraper" | "manual" | (string & {})`) — keep the DB enum loose.
- `AdminProfile.bio` gap flagged — the edit form has a bio field; the type now includes `bio*`.
- "Reset demo data" endpoint added (`POST /api/v1/admin/settings/reset-demo-data`).
- Final specification review items all incorporated: `bank_id` relations everywhere, current/historical rate separation (`exchange_rates` + `exchange_rate_history`), `scrapers` table, §4 priority rules + freshness policy, `GET /api/v1/system/status`, `audit_logs` table, `/api/v1` route prefix, envelope kept.
