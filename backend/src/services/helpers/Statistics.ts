/**
 * Scraper-health statistics helpers.
 *
 * Health is DERIVED from `scrape_logs` (no `scraper_health` table exists).
 * The buckets below are the documented statuses; any other value counts as
 * "unknown". This categorization is business logic, so it lives in the
 * service layer — never in repositories.
 */

import type { ScraperHealthRow } from "@/types/scraper-health";
import { isStaleRate } from "./RateResolution";

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

/** Canonical log-status buckets (D3) — the single source of truth. */
export type LogBucket = "success" | "failed";

/**
 * Maps a raw scrape-log status to the canonical bucket. Any status that is
 * not explicitly `success` is treated as `failed` — a run that did not
 * confirm success is operationally a failure, and a new/unknown value must
 * never silently surface as a third bucket (which filters/validators would
 * reject). Keeps the vocabulary closed: `success | failed`, everywhere.
 */
export function categorizeLogStatus(status: string): LogBucket {
  const normalized = status.trim().toLowerCase();
  if (normalized === "success") return "success";
  return "failed";
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
  /**
   * Scrapers whose `last_rate_date` is older than the staleness window (D2),
   * or that have never produced a rate. Surfaces data freshness on the admin
   * scraper-health view without dropping anything.
   */
  staleCount: number;
}

/**
 * Computes the aggregate summary for a set of health rows. `today` and
 * `maxAgeDays` are injected so staleness is deterministic in tests.
 */
export function summarizeHealth(
  rows: ScraperHealthRow[],
  today: string,
  maxAgeDays: number,
): ScraperHealthSummary {
  let healthy = 0;
  let degraded = 0;
  let failed = 0;
  let unknown = 0;
  let responseTimes = 0;
  let responseTimeCount = 0;
  let failures = 0;
  let failureCount = 0;
  let staleCount = 0;

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
    // A scraper with no rate yet, or one whose last rate is older than the
    // window, is counted as stale — surfaced, never silently dropped.
    if (row.last_rate_date === null || isStaleRate(row.last_rate_date, today, maxAgeDays)) {
      staleCount += 1;
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
    staleCount,
  };
}
