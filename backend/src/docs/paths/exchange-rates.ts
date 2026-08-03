import {
  arrayRef,
  nullableRef,
  pathParam,
  queryParam,
  successResponse,
  type DocPathItem,
} from "../helpers";

const DATE_DESCRIPTION = "Inclusive ISO date (YYYY-MM-DD).";

/** Exchange-rate endpoints (mounted under `/api/v1`). */
export const exchangeRatesPaths: Record<string, DocPathItem> = {
  "/rates/latest": {
    get: {
      tags: ["Exchange Rates"],
      summary: "Get latest exchange rates",
      description:
        "Resolved snapshot: the newest rate row per bank + currency, optionally restricted to a date range.",
      operationId: "getLatestRates",
      parameters: [
        queryParam("from", DATE_DESCRIPTION, { format: "date" }),
        queryParam("to", DATE_DESCRIPTION, { format: "date" }),
      ],
      responses: {
        "200": successResponse("Latest exchange rates retrieved.", arrayRef("ExchangeRate")),
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/rates/latest/{bankCode}": {
    get: {
      tags: ["Exchange Rates"],
      summary: "Get latest rates for a bank",
      description:
        "Resolved rates for one bank (newest per currency), optionally restricted to a date range.",
      operationId: "getLatestRatesByBank",
      parameters: [
        pathParam("bankCode", "Bank code (e.g. ABY)."),
        queryParam("from", DATE_DESCRIPTION, { format: "date" }),
        queryParam("to", DATE_DESCRIPTION, { format: "date" }),
      ],
      responses: {
        "200": successResponse("Latest rates retrieved.", arrayRef("ExchangeRate")),
        "404": { $ref: "#/components/responses/NotFound" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/rates/latest/{bankCode}/{currencyCode}": {
    get: {
      tags: ["Exchange Rates"],
      summary: "Get the latest rate for a bank and currency",
      description:
        "Returns the newest rate row for a single bank + currency pair, or null when none exists.",
      operationId: "getLatestRateByBankAndCurrency",
      parameters: [
        pathParam("bankCode", "Bank code (e.g. ABY)."),
        pathParam("currencyCode", "3-letter currency code (e.g. USD)."),
      ],
      responses: {
        "200": successResponse("Latest rate retrieved.", nullableRef("ExchangeRate")),
        "404": { $ref: "#/components/responses/NotFound" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/rates/history/{bankCode}/{currencyCode}": {
    get: {
      tags: ["Exchange Rates"],
      summary: "Get historical rates for a bank and currency",
      description:
        "Full dated history for a bank + currency pair (oldest first), optionally restricted to a date range.",
      operationId: "getHistoricalRates",
      parameters: [
        pathParam("bankCode", "Bank code (e.g. ABY)."),
        pathParam("currencyCode", "3-letter currency code (e.g. USD)."),
        queryParam("from", DATE_DESCRIPTION, { format: "date" }),
        queryParam("to", DATE_DESCRIPTION, { format: "date" }),
      ],
      responses: {
        "200": successResponse("Historical rates retrieved.", arrayRef("ExchangeRate")),
        "404": { $ref: "#/components/responses/NotFound" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
};
