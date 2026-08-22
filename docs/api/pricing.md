# Pricing

EthioExchangeHub's commercial API is sold as **monthly subscriptions, billed in Ethiopian Birr (ETB)**. Payments are made by manual bank transfer and verified by our team — there is no automatic card billing.

| Plan | Price | Monthly requests | Requests/minute | Max API keys |
| --- | --- | ---: | ---: | ---: |
| **Free** | 0 ETB/month | 2,000 | 30 | 1 |
| **Starter** | 499 ETB/month | 25,000 | 60 | 2 |
| **Business** | 1,499 ETB/month | 100,000 | 120 | 5 |

## Plans

### Free
For testing and small integrations. Evaluate the data quality and response shape with 2,000 requests per month at up to 30 requests per minute, using one API key.

### Starter
For small businesses and applications with steady production traffic. 25,000 requests per month, 60 requests per minute, and two API keys so you can rotate credentials safely.

### Business
For growing businesses and higher-volume integrations. 100,000 requests per month, 120 requests per minute, and up to five API keys for separate environments or services.

## What is included in every plan

- All commercial endpoints (latest rates, per-bank, per-currency, full history, bank directory)
- The complete rate dataset: cash, transactional, and weighted-average rates across covered banks and currencies
- Usage tracking (`GET /customer/usage`) with per-key breakdowns
- Standard response headers showing your remaining rate-limit and quota budget

## Billing notes

- Pricing is **per month**, tied to your subscription's billing period.
- Monthly request quotas reset when a new billing period starts.
- Only successful authorized requests are counted against the quota.
- Upgrading between plans currently means completing a new subscription + payment after the current period ends; select a new plan from your dashboard.
- Payment method: **manual bank transfer** → receipt upload → verification by our team → activation. See [onboarding.md](onboarding.md).
- The authoritative, always-current catalog (including any future changes) is served by `GET /customer/plans` in your dashboard session.
