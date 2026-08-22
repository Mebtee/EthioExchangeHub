# Authentication

All commercial endpoints (`/public/*`) require an EthioExchangeHub API key sent as a bearer token:

```
Authorization: Bearer eeh_live_YOUR_API_KEY
```

API keys are created from your customer dashboard after you have an **active subscription** (see [onboarding.md](onboarding.md)). Keys look like `eeh_live_<43 random characters>`.

## Key facts

- **Shown exactly once.** The complete key is displayed only at creation time. We store only a short public prefix and a SHA-256 hash — the full secret can never be retrieved again. If you lose it, revoke the key and create a new one.
- **Separate from your login.** Customer login sessions use JWTs; those are NOT accepted on the commercial API, and API keys are NOT accepted on dashboard endpoints.
- **Per-key limits.** Rate limits and monthly quotas are enforced per API key and tied to your subscription plan.
- **Revocation is instant.** Revoked keys stop working immediately; revoking is idempotent and non-destructive (the row keeps its status history).

## Keeping keys safe

Treat API keys like passwords:

- Never commit keys to Git or share them in screenshots, tickets, or chat messages.
- Never embed keys in frontend/mobile code intended for public users — call the API from a backend you control.
- Never pass keys in URLs or query strings; they end up in logs and browser history.
- Store keys in environment variables or a secrets manager.
- Revoke compromised keys immediately from the dashboard and issue replacements.

If a key leaks: revoke it in **API Keys**, create a new one, and update your service. Usage already metered to the old key remains part of your billing period total.

## Examples

### cURL

```bash
curl -H "Authorization: Bearer eeh_live_YOUR_API_KEY" \
  https://ethioexchangehub.onrender.com/api/v1/public/rates/latest
```

### JavaScript / fetch

```javascript
fetch(
  "https://ethioexchangehub.onrender.com/api/v1/public/rates/latest",
  {
    headers: {
      Authorization: "Bearer eeh_live_YOUR_API_KEY"
    }
  }
)
  .then((res) => res.json())
  .then((body) => console.log(body.success, body.data));
```

### Python / requests

```python
import requests

response = requests.get(
    "https://ethioexchangehub.onrender.com/api/v1/public/rates/latest",
    headers={
        "Authorization": "Bearer eeh_live_YOUR_API_KEY"
    }
)
response.raise_for_status()
print(response.json()["data"])
```

> Replace `eeh_live_YOUR_API_KEY` with your own key. All documentation examples use placeholders only.

## Auth errors

| Status | Meaning |
| --- | --- |
| `401` | Missing, malformed, unknown, revoked, or expired API key — `{"success":false,"message":"Missing or invalid API key.","data":null}` (revoked/expired keys answer `"API key has been revoked."` / `"API key has expired."`) |
| `403` | Valid key but no usable subscription — e.g. `{"success":false,"message":"No active subscription. Purchase a plan to use the commercial API.","data":null}` or `"Your subscription period has expired. Renew to continue."` |

Full error catalog: [errors-and-limits.md](errors-and-limits.md).
