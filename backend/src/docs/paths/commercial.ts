import type { OpenAPIV3_1 } from "openapi-types";

import { apiExamples } from "../examples";
import {
  type DocOperation,
  type DocPathItem,
  type DocResponses,
  jsonResponse,
  schemaRef,
  successResponse,
} from "../helpers";

/**
 * PUBLIC COMMERCIAL API documentation (Phase 4, Part J).
 *
 * This is the customer-facing contract for the paid product. Every operation
 * requires `Authorization: Bearer eeh_live_…`; examples deliberately use the
 * placeholder `eeh_live_YOUR_API_KEY` — never a real key.
 */

const API_KEY_SECURITY = [{ commercialApiKey: [] as string[] }];

/** Reusable 401/403/429 responses shared by every commercial endpoint. */
function commercialErrors(): DocResponses {
  return {
    "401": jsonResponse("Missing, malformed, unknown, revoked, or expired API key.", {
      type: "object",
      properties: {
        success: { type: "boolean", enum: [false] },
        message: { type: "string" },
        data: { type: "null" },
      },
      example: {
        success: false,
        message: "Missing or invalid API key.",
        data: null,
      },
    }),
    "403": jsonResponse(
      "Valid key but no usable subscription (none active, period expired, or plan unavailable).",
      {
        type: "object",
        properties: {
          success: { type: "boolean", enum: [false] },
          message: { type: "string" },
          data: { type: "null" },
        },
        example: {
          success: false,
          message: "Your subscription period has expired. Renew to continue.",
          data: null,
        },
      },
    ),
    "429": jsonResponse(
      "Either the per-minute rate limit or the monthly quota was exceeded — the `message` states which. Rate-limit hits include `Retry-After` (seconds); quota hits do not (the wait is until the next billing period).",
      {
        type: "object",
        properties: {
          success: { type: "boolean", enum: [false] },
          message: { type: "string" },
          data: { type: "null" },
        },
        example: {
          success: false,
          message:
            "Monthly quota exceeded: your plan includes 2000 requests per billing period. Upgrade your plan or wait for renewal.",
          data: null,
        },
      },
    ),
    "422": jsonResponse(
      'Invalid request — e.g. a malformed currency code (`"usd" is not a valid currency code (expected 3 uppercase letters).`) or an invalid date range.',
      {
        type: "object",
        properties: {
          success: { type: "boolean", enum: [false] },
          message: { type: "string" },
          data: { type: "null" },
        },
        example: { success: false, message: "Validation failed.", data: null },
      },
    ),
    "500": jsonResponse("Internal server error (details are never leaked).", {
      type: "object",
      properties: {
        success: { type: "boolean", enum: [false] },
        message: { type: "string" },
        data: { type: "null" },
      },
      example: { success: false, message: "Internal server error.", data: null },
    }),
  };
}

/** Reusable 404 for unknown/inactive bank codes on the commercial surface. */
function bankNotFound(): DocResponses {
  return {
    "404": jsonResponse(
      'Unknown or inactive bank code — the API answers `Bank "<code>" not found.`',
      {
        type: "object",
        properties: {
          success: { type: "boolean", enum: [false] },
          message: { type: "string" },
          data: { type: "null" },
        },
        example: { success: false, message: 'Bank "NOPE" not found.', data: null },
      },
    ),
  };
}

/** Rate-limit + quota headers the middleware stamps on EVERY commercial response. */
function limitHeaders(): NonNullable<OpenAPIV3_1.ResponseObject["headers"]> {
  return {
    "X-RateLimit-Limit": {
      description: "Plan requests-per-minute.",
      schema: { type: "integer" },
    },
    "X-RateLimit-Remaining": {
      description: "RPM budget left in the current minute window.",
      schema: { type: "integer" },
    },
    "X-Quota-Limit": {
      description: "Plan monthly request limit.",
      schema: { type: "integer" },
    },
    "X-Quota-Remaining": {
      description: "Requests left in the current billing period.",
      schema: { type: "integer" },
    },
    "X-Quota-Reset": {
      description:
        "Start timestamp of the current billing period (ISO 8601) — usage is aggregated per period beginning at this instant; the next reset occurs one monthly period later.",
      schema: { type: "string", format: "date-time" },
    },
  };
}

/** Wraps a 200 response (with limit headers) and merges in the shared error set. */
function commercialSuccess(dataSchema: OpenAPIV3_1.SchemaObject): DocResponses {
  return {
    "200": {
      ...successResponse(
        "Standard envelope. Responses also carry `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-Quota-Limit`, and `X-Quota-Remaining` headers.",
        dataSchema,
      ),
      headers: limitHeaders(),
    },
    ...commercialErrors(),
  };
}

const CODE_SAMPLES = (path: string) =>
  `
\`\`\`bash
curl -H "Authorization: Bearer eeh_live_YOUR_API_KEY" \\
  https://ethioexchangehub.onrender.com/api/v1/public/${path}
\`\`\`

\`\`\`javascript
const res = await fetch(
  "https://ethioexchangehub.onrender.com/api/v1/public/${path}",
  { headers: { Authorization: "Bearer eeh_live_YOUR_API_KEY" } },
);
const body = await res.json();
console.log(body.success, body.data);
\`\`\`

\`\`\`python
import requests

res = requests.get(
    "https://ethioexchangehub.onrender.com/api/v1/public/${path}",
    headers={"Authorization": "Bearer eeh_live_YOUR_API_KEY"},
)
res.raise_for_status()
print(res.json()["data"])
\`\`\`
`.trim();

function op(summary: string, description: string, path: string, operationId: string): DocOperation {
  const samples = CODE_SAMPLES(path);
  return {
    tags: ["Commercial API"],
    summary,
    operationId,
    security: API_KEY_SECURITY,
    description: `${description}\n\n${samples}`,
    responses: {},
  };
}

const ratesArray = (): OpenAPIV3_1.SchemaObject => ({
  type: "array",
  items: schemaRef("ExchangeRate"),
});

/** All `/public/*` operations, keyed by route (relative to the server base). */
export const commercialPaths: Record<string, DocPathItem> = {
  "/public/rates/latest": {
    get: {
      ...op(
        "Get latest rates for all banks",
        "The latest available exchange-rate snapshot across ALL banks — one row per bank + currency, manual overrides applied, ordered by bank then currency code. Each row carries the business date (`rate_date`), collection timestamp (`scraped_at`), a computed `stale` freshness flag, and the day-over-day `change` of the cash buying rate. Optional inclusive `from`/`to` (`rate_date`) query params narrow the snapshot; with `to`, only rows published exactly that day are returned (a bank that did not publish that day is excluded, never backfilled with an older rate).",
        "rates/latest",
        "getCommercialLatestRates",
      ),
      parameters: [
        {
          name: "from",
          in: "query",
          required: false,
          schema: { type: "string", format: "date" },
          description: "Inclusive lower bound on rate_date (YYYY-MM-DD).",
        },
        {
          name: "to",
          in: "query",
          required: false,
          schema: { type: "string", format: "date" },
          description: "Exact-day filter: only rows whose rate_date equals this day.",
        },
      ],
      responses: commercialSuccess(ratesArray()),
    },
  },

  "/public/rates/latest/{bankCode}": {
    get: {
      ...op(
        "Get latest rates for one bank",
        "The latest available snapshot for ONE bank — newest row per currency. Unknown or inactive bank codes answer 404; a known bank that has not published any rates yet returns an empty `data` array.",
        "rates/latest/CBE",
        "getCommercialLatestRatesByBank",
      ),
      parameters: [
        {
          name: "bankCode",
          in: "path",
          required: true,
          schema: { type: "string", example: apiExamples.exchangeRate.bank_code ?? "CBE" },
        },
        {
          name: "from",
          in: "query",
          required: false,
          schema: { type: "string", format: "date" },
        },
        {
          name: "to",
          in: "query",
          required: false,
          schema: { type: "string", format: "date" },
        },
      ],
      responses: { ...bankNotFound(), ...commercialSuccess(ratesArray()) },
    },
  },

  "/public/rates/latest/{bankCode}/{currencyCode}": {
    get: {
      ...op(
        "Get latest rate for one bank + currency",
        "The single newest rate for one bank + currency pair, e.g. CBE/USD (manual override wins a date tie). The data payload is a single object, or `null` (with success `true`) when nothing has been published for that pair yet. Unknown banks answer 404; malformed currency codes (not three uppercase letters) answer 422.",
        "rates/latest/CBE/USD",
        "getCommercialLatestRateByBankAndCurrency",
      ),
      parameters: [
        {
          name: "bankCode",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
        {
          name: "currencyCode",
          in: "path",
          required: true,
          schema: { type: "string", example: "USD" },
        },
      ],
      responses: {
        ...bankNotFound(),
        ...commercialSuccess({
          oneOf: [schemaRef("ExchangeRate"), { type: "null" }],
        }),
      },
    },
  },

  "/public/rates/history/{bankCode}/{currencyCode}": {
    get: {
      ...op(
        "Get rate history for one bank + currency",
        "Full dated history for a bank + currency pair, oldest first, one row per business date (manual overrides win a same-date tie, so history stays consistent with the latest snapshot). Unknown banks answer 404; a pair with no published rows returns an empty array. Optional inclusive `from`/`to` bounds on `rate_date`.",
        "rates/history/CBE/USD?from=2026-01-01&to=2026-01-31",
        "getCommercialRateHistory",
      ),
      parameters: [
        {
          name: "bankCode",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
        {
          name: "currencyCode",
          in: "path",
          required: true,
          schema: { type: "string", example: "USD" },
        },
        {
          name: "from",
          in: "query",
          required: false,
          schema: { type: "string", format: "date" },
        },
        {
          name: "to",
          in: "query",
          required: false,
          schema: { type: "string", format: "date" },
        },
      ],
      responses: { ...bankNotFound(), ...commercialSuccess(ratesArray()) },
    },
  },

  "/public/banks": {
    get: {
      ...op(
        "List covered banks",
        "Directory of ACTIVE banks covered by EthioExchangeHub (inactive banks are never exposed commercially). Useful for discovering valid `bankCode` values and bank metadata.",
        "banks",
        "listCommercialBanks",
      ),
      responses: commercialSuccess({ type: "array", items: schemaRef("Bank") }),
    },
  },

  "/public/banks/{bankCode}": {
    get: {
      ...op(
        "Get one bank",
        "One active bank by its natural key, e.g. `CBE`. Unknown or inactive codes answer 404.",
        "banks/CBE",
        "getCommercialBank",
      ),
      parameters: [
        {
          name: "bankCode",
          in: "path",
          required: true,
          schema: { type: "string", example: "CBE" },
        },
      ],
      responses: {
        "200": {
          ...successResponse("Bank found.", schemaRef("Bank")),
          headers: limitHeaders(),
        },
        ...bankNotFound(),
        ...commercialErrors(),
      },
    },
  },
};
