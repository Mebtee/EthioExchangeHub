import { ScrapeLogsRepository } from "@/repositories/ScrapeLogsRepository";
import type { ScrapeLogRow } from "@/types/database";
import type { ScraperHealthRow } from "@/types/scraper-health";
import { todayLocalIso } from "@/utils/date";
import { DEFAULT_MAX_RATE_AGE_DAYS } from "./helpers/RateResolution";
import { sortLogsNewestFirst } from "./helpers/Sorting";
import {
  categorizeLogStatus,
  categorizeScraperStatus,
  summarizeHealth,
  type ScraperBucket,
  type ScraperHealthSummary,
} from "./helpers/Statistics";
import { sortByBankCode } from "./helpers/Sorting";

/** Public contract of the scraper-health service. */
export interface ScraperHealthService {
  /** Aggregate health summary + statistics for all scrapers. */
  getSummary(): Promise<ScraperHealthSummary>;
  /** Health rows bucketed as healthy (alphabetical by bank code). */
  listHealthy(): Promise<ScraperHealthRow[]>;
  /** Health rows bucketed as degraded (alphabetical by bank code). */
  listDegraded(): Promise<ScraperHealthRow[]>;
  /** Health rows bucketed as failed (alphabetical by bank code). */
  listFailed(): Promise<ScraperHealthRow[]>;
  /** Every health row, alphabetical by bank code (the per-scraper admin list). */
  listAll(): Promise<ScraperHealthRow[]>;
  /** The health row for a single bank, or null when it has no logs yet. */
  findByBankCode(bankCode: string): Promise<ScraperHealthRow | null>;
}

/**
 * Scraper-health business logic: derives per-bank health from `scrape_logs`
 * and computes status buckets, aggregate statistics, and stale detection.
 * No cron, no scheduler, no scraping — this service only summarizes the
 * persisted log rows.
 *
 * There is deliberately NO `scraper_health` table; health is computed here on
 * every read so the admin view always reflects the latest log history.
 *
 * The per-bucket counts (healthy/degraded/failed) are available on the
 * summary returned by `getSummary()`; the list methods return the rows.
 */
export class ScraperHealthServiceImpl implements ScraperHealthService {
  constructor(
    private readonly scrapeLogsRepository: ScrapeLogsRepository,
    /** Staleness window (D2) — injected so tests stay deterministic. */
    private readonly maxRateAgeDays: number = DEFAULT_MAX_RATE_AGE_DAYS,
    private readonly todayProvider: () => string = todayLocalIso,
  ) {}

  /** Computes the aggregate summary over all derived health rows. */
  async getSummary(): Promise<ScraperHealthSummary> {
    return summarizeHealth(await this.deriveAllRows(), this.todayProvider(), this.maxRateAgeDays);
  }

  /** Lists rows categorized as healthy. */
  async listHealthy(): Promise<ScraperHealthRow[]> {
    return this.listByBucket("healthy");
  }

  /** Lists rows categorized as degraded. */
  async listDegraded(): Promise<ScraperHealthRow[]> {
    return this.listByBucket("degraded");
  }

  /** Lists rows categorized as failed. */
  async listFailed(): Promise<ScraperHealthRow[]> {
    return this.listByBucket("failed");
  }

  /** Lists every health row, alphabetical by bank code. */
  async listAll(): Promise<ScraperHealthRow[]> {
    return sortByBankCode(await this.deriveAllRows());
  }

  /** Returns a bank's health row (null when it has no logs yet — not an error). */
  async findByBankCode(bankCode: string): Promise<ScraperHealthRow | null> {
    const rows = await this.deriveAllRows();
    return rows.find((row) => row.bank_code === bankCode) ?? null;
  }

  /** Shared filter: rows whose categorized status equals the bucket. */
  private async listByBucket(bucket: ScraperBucket): Promise<ScraperHealthRow[]> {
    const rows = await this.deriveAllRows();
    return sortByBankCode(rows.filter((row) => categorizeScraperStatus(row.status) === bucket));
  }

  /**
   * Derives one health row per bank that has at least one scrape log, from
   * that bank's newest log plus its trailing run history.
   */
  private async deriveAllRows(): Promise<ScraperHealthRow[]> {
    const logs = await this.scrapeLogsRepository.findAll();
    return deriveHealthRows(logs);
  }
}

/**
 * Derives one `ScraperHealthRow` per distinct `bank_code` in the logs.
 * Banks with no logs yield no row (they have no run history yet).
 */
export function deriveHealthRows(logs: ScrapeLogRow[]): ScraperHealthRow[] {
  const logsByBank = new Map<string, ScrapeLogRow[]>();
  for (const log of logs) {
    const group = logsByBank.get(log.bank_code) ?? [];
    group.push(log);
    logsByBank.set(log.bank_code, group);
  }

  const rows: ScraperHealthRow[] = [];
  for (const [bankCode, bankLogs] of logsByBank) {
    rows.push(deriveHealthRow(bankCode, bankLogs));
  }
  return rows;
}

/**
 * Derives a bank's health row from its log history:
 *  - `status`: newest log success → healthy, newest failure → failed, no
 *    success yet → failed (a run that never confirmed success is operationally
 *    a failure).
 *  - `consecutive_failures`: trailing failed runs from the newest log.
 *  - `last_success` / `last_failure`: timestamps of the newest success/failure.
 *  - `last_rate_date`: the newest SUCCESSFUL run's date — the last date the
 *    scraper confirmed it captured rates (drives staleness).
 *  - `response_time_ms`: the newest log's duration.
 *  - `updated_at`: the newest log's `ran_at`.
 */
export function deriveHealthRow(bankCode: string, logs: ScrapeLogRow[]): ScraperHealthRow {
  const sorted = sortLogsNewestFirst(logs);
  const newest = sorted[0];

  const lastSuccess = sorted.find((log) => categorizeLogStatus(log.status) === "success");
  const lastFailure = sorted.find((log) => categorizeLogStatus(log.status) === "failed");

  let consecutiveFailures = 0;
  for (const log of sorted) {
    if (categorizeLogStatus(log.status) === "failed") consecutiveFailures += 1;
    else break;
  }

  return {
    bank_code: bankCode,
    status: newest && categorizeLogStatus(newest.status) === "success" ? "healthy" : "failed",
    consecutive_failures: consecutiveFailures,
    last_success: lastSuccess?.ran_at ?? null,
    last_failure: lastFailure?.ran_at ?? null,
    last_rate_date: lastSuccess?.ran_at?.slice(0, 10) ?? null,
    response_time_ms: newest?.duration_ms ?? null,
    updated_at: newest?.ran_at ?? null,
  };
}
