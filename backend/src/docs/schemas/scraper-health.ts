import type { OpenAPIV3_1 } from "openapi-types";

import { apiExamples } from "../examples";

/** `ScraperHealth` — per-bank stats derived from `scrape_logs` (no `scraper_health` table). */
export const scraperHealthSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "Per-bank scraper operational statistics, derived from scrape logs.",
  example: apiExamples.scraperHealth,
  properties: {
    bank_code: { type: "string", description: "Bank natural key." },
    status: {
      type: "string",
      description: 'Business bucket ("healthy" / "failed" / "degraded" / "unknown").',
    },
    consecutive_failures: {
      type: ["number", "null"],
      description: "Trailing consecutive failed runs.",
    },
    last_success: { type: ["string", "null"], format: "date-time" },
    last_failure: { type: ["string", "null"], format: "date-time" },
    last_rate_date: {
      type: ["string", "null"],
      format: "date",
      description: "Date of the newest successful run.",
    },
    response_time_ms: { type: ["number", "null"], description: "Newest run duration in ms." },
    updated_at: {
      type: ["string", "null"],
      format: "date-time",
      description: "Newest run timestamp.",
    },
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
        "Scrapers whose last successful run (last_rate_date) is missing or older than MAX_RATE_AGE_DAYS before today.",
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
