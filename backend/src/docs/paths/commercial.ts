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
      "Either the per-minute rate limit or the monthly quota was exceeded — the `message` states which, and `Retry-After` (seconds) accompanies rate-limit hits.",
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
    "422": jsonResponse("Invalid bank/currency code or date range.", {
      type: "object",
      properties: {
        success: { type: "boolean", enum: [false] },
        message: { type: "string" },
        data: { type: "null" },
      },
      example: { success: false, message: "Validation failed.", data: null },
    }),
    "500": jsonResponse("Internal server error (details are never leaked).", {
      type: "object",
      properties: {
        success: { type: "boolean", enum: [false] },
        message: { type: "string" },
        data: { type: "null" },
      },
    }),
  };
}

/** Wraps a 200 response and merges in the shared error set. */
function commercialSuccess(dataSchema: OpenAPIV3_1.SchemaObject): DocResponses {
  return {
    "200": {
      ...successResponse(
        "Standard envelope. Responses also carry `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-Quota-Limit`, and `X-Quota-Remaining` headers.",
        dataSchema,
      ),
      headers: {
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
      },
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

function op(description: string, path: string): DocOperation {
  const samples = CODE_SAMPLES(path);
  return {
    tags: ["Commercial API"],
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
        "Latest resolved exchange-rate snapshot across ALL banks — one row per bank + currency, manual overrides applied, ordered by code. Optional inclusive `from`/`to` (`rate_date`) query params.",
        "rates/latest",
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
        "Latest snapshot for ONE bank — newest row per currency. 404 when the bank code is unknown.",
        "rates/latest/CBE",
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
      responses: commercialSuccess(ratesArray()),
    },
  },

  "/public/rates/latest/{bankCode}/{currencyCode}": {
    get: {
      ...op(
        "The single newest rate for one bank + currency pair (manual override wins a date tie). Data payload is a single object or `null` when nothing has been published yet.",
        "rates/latest/CBE/USD",
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
      responses: commercialSuccess({
        oneOf: [schemaRef("ExchangeRate"), { type: "null" }],
      }),
    },
  },

  "/public/rates/history/{bankCode}/{currencyCode}": {
    get: {
      ...op(
        "Full dated history for a bank + currency pair, oldest first, one row per business date. Optional inclusive `from`/`to` bounds.",
        "rates/history/CBE/USD?from=2026-01-01&to=2026-01-31",
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
          schema: { type: "string" },
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
      responses: commercialSuccess(ratesArray()),
    },
  },

  "/public/banks": {
    get: {
      ...op(
        "Directory of ACTIVE banks covered by EthioExchangeHub (inactive banks are never exposed commercially).",
        "banks",
      ),
      responses: commercialSuccess({ type: "array", items: schemaRef("Bank") }),
    },
  },

  "/public/banks/{bankCode}": {
    get: {
      ...op(
        "One active bank by its natural key, e.g. `CBE`. 404 when unknown/inactive.",
        "banks/CBE",
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
        "200": successResponse("Bank found.", schemaRef("Bank")),
        "404": jsonResponse("Unknown bank code.", {
          type: "object",
          properties: {
            success: { type: "boolean", enum: [false] },
            message: { type: "string" },
            data: { type: "null" },
          },
        }),
        ...commercialErrors(),
      },
    },
  },
};
