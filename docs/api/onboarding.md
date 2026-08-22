# Onboarding Guide

How to go from zero to your first successful commercial API call. Payments are currently **verified manually** by the EthioExchangeHub team — activation is usually quick during working hours, but it is not an automated process.

## Step-by-step

### STEP 1 — Create a customer account
Sign up at [ethioexchange.live](https://ethioexchange.live) with your name, email, and a password.

### STEP 2 — Log in
Log in to access your customer dashboard.

### STEP 3 — Choose an API plan
Open **Subscriptions** and pick a plan ([pricing](pricing.md)). Selecting a plan creates your subscription:
- The **Free** plan activates immediately.
- Paid plans (Starter, Business) start in `pending` status until payment is verified.

### STEP 4 — View the bank-transfer payment instructions
The dashboard shows the active EthioExchangeHub bank accounts with transfer instructions (`GET /customer/payment-methods`).

### STEP 5 — Transfer the required amount
Transfer the plan price (in ETB) from your bank using the provided account details.

### STEP 6 — Submit the transaction reference and receipt
In **Payments**, submit the bank transaction reference for your pending subscription, then upload your payment receipt (PNG/JPEG/WEBP or PDF, max 5 MB). One receipt per payment.

### STEP 7 — Wait for admin verification
Our team reviews the transfer against the submitted reference. You can track the status in the dashboard (`pending` → review → decision).

### STEP 8 — Subscription activated
Once approved, your subscription becomes `active` with a fresh monthly billing period, and your plan's limits take effect.

### STEP 9 — Create an API key
In **API Keys**, create a key. Requires an active subscription; the number of simultaneous keys depends on your plan. **The full key is displayed exactly once — copy it immediately and store it safely** ([authentication.md](authentication.md)).

### STEP 10 — Use the API key
Call any commercial endpoint with `Authorization: Bearer eeh_live_YOUR_API_KEY`.

### STEP 11 — Monitor usage
Track requests used/remaining per billing period and per key via `GET /customer/usage`, or watch the `X-Quota-Remaining` response header on every call.

---

## Five-minute quickstart

Already have an approved subscription? This takes five minutes:

1. **Create account** at [ethioexchange.live](https://ethioexchange.live).
2. **Subscribe**: Subscriptions → choose a plan.
3. **Complete the bank payment** and submit reference + receipt (paid plans).
4. **Wait for approval** — your dashboard shows the active subscription when done.
5. **Create an API key** under API Keys and copy the secret.
6. **Make your first request:**

```bash
curl \
  -H "Authorization: Bearer eeh_live_YOUR_API_KEY" \
  "https://ethioexchangehub.onrender.com/api/v1/public/rates/latest"
```

A realistic success response looks like this:

```json
{
  "success": true,
  "message": "Latest exchange rates retrieved.",
  "data": [
    {
      "id": "c8f21ffd-9c80-46fa-828d-69bf5d89eb78",
      "bank_code": "ABY",
      "currency_code": "USD",
      "buying_rate": 123.45,
      "selling_rate": 124.55,
      "transactional_buying": null,
      "transactional_selling": null,
      "weighted_avg_buying": null,
      "weighted_avg_selling": null,
      "rate_date": "2026-08-02",
      "source": "SCRAPER",
      "scraped_at": "2026-08-02T08:00:00.000Z",
      "stale": false,
      "change": 0.42
    }
  ]
}
```

(One entry per bank + currency; values are illustrative.)

## Troubleshooting first calls

| Symptom | Likely cause |
| --- | --- |
| `401 Missing or invalid API key.` | Key missing/mistyped, revoked, or expired |
| `403 No active subscription...` | Subscription not yet approved — complete the payment steps |
| `429 Rate limit exceeded...` | More than your plan's requests-per-minute — slow down and retry |
| `429 Monthly quota exceeded...` | Billing-period quota used up — upgrade or wait for renewal |

More: [errors-and-limits.md](errors-and-limits.md).
