# Errors & Limits

## Response envelope

Every response — success or error — uses the same JSON envelope:

```json
{ "success": true, "message": "...", "data": { } }
```

Errors carry `success: false` and `data: null`; the human-readable `message` explains what went wrong.

```json
{ "success": false, "message": "Missing or invalid API key.", "data": null }
```

## Error catalog (commercial API)

| Status | Meaning | Example message |
| --- | --- | --- |
| `401` | Missing, malformed, unknown, or expired API key | `Missing or invalid API key.` |
| `401` | Key was revoked | `API key has been revoked.` |
| `403` | No active subscription for the key's customer | `No active subscription. Purchase a plan to use the commercial API.` |
| `403` | Subscription exists but its billing period is over | `Your subscription period has expired. Renew to continue.` |
| `403` | Plan temporarily unavailable | `Your plan is currently unavailable. Contact support.` |
| `404` | Unknown or inactive bank code | `Bank "NOPE" not found.` |
| `422` | Invalid parameter format | `"usd" is not a valid currency code (expected 3 uppercase letters).` / `Invalid date range: "from" (...) is after "to" (...).` |
| `429` | Per-minute rate limit exceeded | `Rate limit exceeded: your plan allows 30 requests per minute. Retry shortly.` |
| `429` | Monthly quota exhausted | `Monthly quota exceeded: your plan includes 2000 requests per billing period. Upgrade your plan or wait for renewal.` |
| `500` | Internal server error (details never leaked) | `Internal server error.` |

### Rate limit vs monthly quota — what's the difference?

- **Rate limit (RPM)** caps how many requests you can make *per minute* (a burst-protection window). If you hit it, wait up to one minute and retry; the response includes a `Retry-After` header telling you how many seconds to wait.
- **Monthly quota** caps total successful requests *per billing period*. Retrying immediately will not help — the quota resets only when your subscription renews, so upgrade your plan if you need more volume.

Both are returned as HTTP `429`, but the `message` always states which one applied.

## Rate limits per plan

| Plan | Requests/minute |
| --- | --- |
| Free | 30 |
| Starter | 60 |
| Business | 120 |

- Limits are enforced **per API key**, not per IP or per customer — rotating IPs does not raise your budget, and multiple keys under one plan each get their own window.
- Exceeding the limit returns `429` with the message above and a `Retry-After` header (seconds until the current minute window resets).

## Monthly quotas per plan

| Plan | Monthly requests |
| --- | --- |
| Free | 2,000 |
| Starter | 25,000 |
| Business | 100,000 |

How usage measurement works:

- Usage is measured **per API key** and aggregated against **your active subscription's billing period** (`current_period_start` → end).
- Only **successful authorized commercial requests** are metered — failed authentication, validation errors (4xx), and server errors never count.
- When the quota is exhausted, further commercial requests are rejected with `429` until the **next billing period starts** and usage resets.
- Check your remaining budget any time via `GET /customer/usage` (dashboard session) or from the response headers below.

## Response headers on every commercial call

Successful (and limited) commercial responses carry:

| Header | Meaning |
| --- | --- |
| `X-RateLimit-Limit` | Your plan's requests-per-minute |
| `X-RateLimit-Remaining` | Requests left in the current minute window |
| `Retry-After` | Seconds to wait before retrying (**rate-limit hits only**) |
| `X-Quota-Limit` | Your plan's monthly request limit |
| `X-Quota-Remaining` | Successful requests left in the current billing period |
| `X-Quota-Reset` | Start timestamp of the current billing period (ISO 8601) |

Example: hitting the per-minute cap returns headers like

```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 0
Retry-After: 42
X-Quota-Limit: 2000
X-Quota-Remaining: 1975
X-Quota-Reset: 2026-08-01T00:00:00.000Z
```

## What happens when a subscription expires?

When your billing period ends without renewal, requests stop returning data:

- The API answers `403` with `Your subscription period has expired. Renew to continue.`
- Your API keys remain listed in the dashboard and start working again as soon as a renewal payment is approved — no need to recreate them.
- Usage counters stay associated with their own billing periods; a renewed subscription starts a fresh period.

## What happens when a quota is exhausted?

- Further commercial requests answer `429` with the monthly-quota message (no `Retry-After`, since the reset is measured in days).
- Non-commercial surfaces (the free website) are unaffected — quotas apply only to the paid `/public/*` API.
