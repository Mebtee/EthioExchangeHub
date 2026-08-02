/**
 * Scraper-health statistics helpers.
 *
 * `scraper_health.status` is free text in the live database (currently only
 * "unknown" is present). The buckets below are the documented statuses; any
 * other value counts as "unknown". This categorization is business logic, so
 * it lives in the service layer — never in repositories.
 */

import type { ScraperHealthRow } from "@/types/database";

/** Business buckets for scraper health status. */
export type ScraperBucket = "healthy" | "degraded" | "failed" | "unknown";

const FAILED_STATUSES = new Set(["failed", "offline", "error"]);

/** Maps a raw status string to a business bucket. */
export function categorizeScraperStatus(status: string): ScraperBucket {
  if (status === "healthy") return "healthy";
  if (status === "degraded") return "degraded";
  if (FAILED_STATUSES.has(status)) return "failed";
  return "unknown";
}

/** Aggregate summary computed from all health rows. */
export interface ScraperHealthSummary {
  total: number;
  healthy: number;
  degraded: number;
  failed: number;
  unknown: number;
  /** Average response time in ms across rows that have one, else null. */
  averageResponseTimeMs: number | null;
  /** Average consecutive failures across rows that have one, else null. */
  averageConsecutiveFailures: number | null;
}

/** Computes the aggregate summary for a set of health rows. */
export function summarizeHealth(rows: ScraperHealthRow[]): ScraperHealthSummary {
  let healthy = 0;
  let degraded = 0;
  let failed = 0;
  let unknown = 0;
  let responseTimes = 0;
  let responseTimeCount = 0;
  let failures = 0;
  let failureCount = 0;

  for (const row of rows) {
    const bucket = categorizeScraperStatus(row.status);
    if (bucket === "healthy") healthy += 1;
    else if (bucket === "degraded") degraded += 1;
    else if (bucket === "failed") failed += 1;
    else unknown += 1;

    if (row.response_time_ms !== null) {
      responseTimes += row.response_time_ms;
      responseTimeCount += 1;
    }
    if (row.consecutive_failures !== null) {
      failures += row.consecutive_failures;
      failureCount += 1;
    }
  }

  return {
    total: rows.length,
    healthy,
    degraded,
    failed,
    unknown,
    averageResponseTimeMs: responseTimeCount > 0 ? responseTimes / responseTimeCount : null,
    averageConsecutiveFailures: failureCount > 0 ? failures / failureCount : null,
  };
}
