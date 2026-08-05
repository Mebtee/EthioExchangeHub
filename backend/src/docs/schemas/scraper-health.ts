import type { OpenAPIV3_1 } from "openapi-types";

import { apiExamples } from "../examples";

/** `scraper_health` row. */
export const scraperHealthSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "Per-bank scraper operational statistics.",
  example: apiExamples.scraperHealth,
  properties: {
    bank_code: { type: "string", description: "Bank natural key." },
    status: { type: "string", description: 'Raw status text (live data: "unknown").' },
    consecutive_failures: { type: ["number", "null"], description: "Consecutive failed runs." },
    last_success: { type: ["string", "null"], format: "date-time" },
    last_failure: { type: ["string", "null"], format: "date-time" },
    last_rate_date: { type: ["string", "null"], format: "date" },
    response_time_ms: { type: ["number", "null"], description: "Last run duration in ms." },
    updated_at: { type: ["string", "null"], format: "date-time" },
  },
  required: ["bank_code", "status"],
};

/** Aggregate summary returned by `GET /scraper-health`. */
export const scraperHealthSummarySchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "Aggregate scraper-health summary across all banks.",
  example: apiExamples.scraperHealthSummary,
  properties: {
    total: { type: "number", description: "Total health rows." },
    healthy: { type: "number" },
    degraded: { type: "number" },
    failed: { type: "number" },
    unknown: { type: "number" },
    averageResponseTimeMs: { type: ["number", "null"] },
    averageConsecutiveFailures: { type: ["number", "null"] },
    staleCount: {
      type: "number",
      description:
        "Scrapers whose last_rate_date is missing or older than MAX_RATE_AGE_DAYS before today.",
    },
  },
  required: [
    "total",
    "healthy",
    "degraded",
    "failed",
    "unknown",
    "averageResponseTimeMs",
    "averageConsecutiveFailures",
    "staleCount",
  ],
};
