import type { OpenAPIV3_1 } from "openapi-types";

import { apiExamples } from "../examples";

/** `exchange_rates` row — one dated row per bank + currency pair. */
export const exchangeRateSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "A single dated exchange-rate row for a bank + currency pair.",
  example: apiExamples.exchangeRate,
  properties: {
    id: { type: "string", format: "uuid", description: "Row id." },
    bank_code: { type: "string", description: "Bank natural key." },
    currency_code: { type: "string", description: "3-letter currency code." },
    buying_rate: { type: ["number", "null"], description: "Cash buying rate." },
    selling_rate: { type: ["number", "null"], description: "Cash selling rate." },
    transactional_buying: { type: ["number", "null"] },
    transactional_selling: { type: ["number", "null"] },
    weighted_avg_buying: { type: ["number", "null"] },
    weighted_avg_selling: { type: ["number", "null"] },
    rate_date: { type: "string", format: "date", description: "ISO date (YYYY-MM-DD)." },
    source: { type: ["string", "null"], description: 'Origin of the row (e.g. "SCRAPER").' },
    scraped_at: { type: ["string", "null"], format: "date-time", description: "Scrape timestamp." },
    stale: {
      type: "boolean",
      description:
        "Computed freshness flag (D2): true when the rate_date is older than MAX_RATE_AGE_DAYS before today. Stale rows are always served — never dropped.",
    },
  },
  required: ["id", "bank_code", "currency_code", "rate_date", "stale"],
};

/** Inclusive `rate_date` bounds across all published rates (`GET /rates/date-range`). */
export const rateDateRangeSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "The oldest and newest rate_date across all published rates.",
  example: apiExamples.rateDateRange,
  properties: {
    min: {
      type: ["string", "null"],
      format: "date",
      description: "Oldest rate_date (null when no data).",
    },
    max: {
      type: ["string", "null"],
      format: "date",
      description: "Newest rate_date (null when no data).",
    },
  },
  required: ["min", "max"],
};
