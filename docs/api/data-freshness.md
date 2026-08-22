# Data Freshness

What the exchange-rate data represents, and how fresh it is.

## How data arrives

EthioExchangeHub runs scrapers against Ethiopian bank websites on business days. Each collected rate becomes a dated row in the platform's database. The commercial API serves exactly that published dataset — it is a **"latest available rate"** API, not an intraday real-time tick feed.

## Field semantics

Every rate row carries these freshness-related fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `rate_date` | date (`YYYY-MM-DD`) | The **business date** the bank published the rate for. This — not collection time — drives resolution, history, and staleness. |
| `scraped_at` | timestamp (nullable) | When the scraper captured the row. `null` for manually entered overrides. |
| `stale` | boolean | Computed freshness flag: `true` when `rate_date` is older than the configured age window (**7 days** by default) relative to today. Stale rows are always served and flagged — never dropped or hidden. |
| `change` | number \| null | Percent change of the cash **buying rate** versus the previous resolved business date for the same bank + currency. `null` when there is no buying rate or no prior business date exists (never a fabricated 0%). Based on `rate_date`, never `scraped_at`. |

## What "latest" means

`GET /public/rates/latest*` returns the newest published row per bank + currency:

- If a bank has not published today yet, the most recent available business date for that pair is what you get — with `rate_date` telling you exactly how old it is.
- Rows whose `rate_date` exceeds the 7-day window are returned with `"stale": true`. Treat stale rows as indicative rather than current pricing.
- Administrators may enter manual rate overrides; when a manual row and a scraped row share the same date, the manual override wins the tie so the latest snapshot and the history endpoint never disagree.

## Recommended client behavior

1. Read `rate_date` to display "as of" dates alongside rates.
2. Surface `stale: true` rows with a visual indicator instead of silently mixing them into current data.
3. Use `change` to show movement, and handle `null` (no prior business date) gracefully.
4. Poll at a cadence your plan allows; there is no benefit to sub-minute polling since data updates when banks publish.

## Guarantees we do NOT make

- No real-time or intraday streaming rates.
- No fixed publication schedule per bank — banks publish at their own pace, which is why `rate_date` and `stale` exist.
- Historical depth depends on when each bank's scraping began; use `from`/`to` filters on the history endpoint to inspect actual coverage.
