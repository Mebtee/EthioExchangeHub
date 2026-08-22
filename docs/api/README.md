# EthioExchangeHub API — Developer Documentation

## Reliable Ethiopian Bank Exchange Rates via API

EthioExchangeHub collects daily exchange rates published by Ethiopian banks — cash buying/selling, transactional, and weighted-average rates for major currencies (USD, EUR, GBP, and more) — and serves them as clean JSON over HTTPS.

The **Commercial API** is the paid, authenticated data product on top of that platform. It is designed for developers and businesses that need programmatic access to Ethiopian bank rates:

- fintech and remittance applications
- currency-conversion tools
- bank-rate comparison websites
- financial dashboards and analytics
- treasury and back-office tooling

Interactive reference: **https://ethioexchangehub.onrender.com/docs** (OpenAPI 3.1 / Swagger UI)

Commercial base URL: `https://ethioexchangehub.onrender.com/api/v1`

---

## What the API provides

| Endpoint | Purpose |
| --- | --- |
| `GET /public/rates/latest` | Latest available rate snapshot across all covered banks (one row per bank + currency) |
| `GET /public/rates/latest/{bankCode}` | Latest snapshot for one bank |
| `GET /public/rates/latest/{bankCode}/{currencyCode}` | The single newest rate for one bank + currency pair |
| `GET /public/rates/history/{bankCode}/{currencyCode}` | Full dated history for a bank + currency pair, oldest first |
| `GET /public/banks` | Directory of covered (active) banks |
| `GET /public/banks/{bankCode}` | One bank by code |

Every response is JSON with the envelope `{ "success": true|false, "message": "...", "data": ... }`.

Authentication is one header: `Authorization: Bearer eeh_live_YOUR_API_KEY`. See [authentication.md](authentication.md).

## What the data looks like

Each rate row includes the business date (`rate_date`), when it was collected (`scraped_at`), a computed freshness flag (`stale`) and day-over-day change (`change`). See [data-freshness.md](data-freshness.md) and the full schema at `/docs`.

## Plans & usage limits

Monthly subscriptions priced in ETB. See [pricing.md](pricing.md) for details.

| Plan | Price | Monthly requests | Requests/minute | Max API keys |
| --- | --- | --- | --- | --- |
| Free | 0 ETB/month | 2,000 | 30 | 1 |
| Starter | 499 ETB/month | 25,000 | 60 | 2 |
| Business | 1,499 ETB/month | 100,000 | 120 | 5 |

Rate limits apply per API key; monthly quotas reset with each billing period; only successful requests are metered. Details in [errors-and-limits.md](errors-and-limits.md).

## Getting started

See [onboarding.md](onboarding.md) for the full account → plan → payment → API key walkthrough, including a five-minute quickstart.

In short: create an account, choose a plan, complete the manual bank transfer (payments are verified manually by our team), create an API key, and start calling the API:

```bash
curl \
  -H "Authorization: Bearer eeh_live_YOUR_API_KEY" \
  "https://ethioexchangehub.onrender.com/api/v1/public/rates/latest"
```

## What you can build

Practical uses of the commercial API include:

- **Currency conversion applications** — convert amounts using the latest cash buying/selling rates from a chosen bank.
- **Bank-rate comparison websites** — show side-by-side rates across all covered banks from one snapshot call.
- **Financial dashboards** — chart historical trends per bank + currency with the history endpoint.
- **Remittance applications** — estimate payout values against current official bank rates.
- **Treasury tools** — track daily official rates for accounting and reporting workflows.
- **Business rate monitoring** — poll the latest endpoint on a schedule and alert on movement (`change`, `stale`).
- **Financial analytics** — analyze dated rate histories across banks and currencies.

The API serves published bank exchange rates as JSON. It does not provide trading, payments, or real-time tick data.

## Support

- Website: <https://ethioexchange.live> (contact form)
- Email: <ethioexchanges@gmail.com>

Documentation contents: [authentication](authentication.md) · [pricing](pricing.md) · [errors & limits](errors-and-limits.md) · [data freshness](data-freshness.md) · [onboarding & quickstart](onboarding.md)
