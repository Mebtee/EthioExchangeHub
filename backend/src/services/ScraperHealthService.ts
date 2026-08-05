import { ScraperHealthRepository } from "@/repositories/ScraperHealthRepository";
import type { ScraperHealthRow } from "@/types/database";
import { todayLocalIso } from "@/utils/date";
import { DEFAULT_MAX_RATE_AGE_DAYS } from "./helpers/RateResolution";
import {
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
  /** The health row for a single bank, or null when it has no row yet. */
  findByBankCode(bankCode: string): Promise<ScraperHealthRow | null>;
}

/**
 * Scraper-health business logic: status categorization, aggregate statistics,
 * and bucketed listings. No cron, no scheduler, no scraping — this service
 * only summarizes the persisted health rows.
 *
 * The per-bucket counts (healthy/degraded/failed) are available on the
 * summary returned by `getSummary()`; the list methods return the rows.
 */
export class ScraperHealthServiceImpl implements ScraperHealthService {
  constructor(
    private readonly scraperHealthRepository: ScraperHealthRepository,
    /** Staleness window (D2) — injected so tests stay deterministic. */
    private readonly maxRateAgeDays: number = DEFAULT_MAX_RATE_AGE_DAYS,
    private readonly todayProvider: () => string = todayLocalIso,
  ) {}

  /** Computes the aggregate summary over all health rows. */
  async getSummary(): Promise<ScraperHealthSummary> {
    return summarizeHealth(
      await this.scraperHealthRepository.findAll(),
      this.todayProvider(),
      this.maxRateAgeDays,
    );
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
    return sortByBankCode(await this.scraperHealthRepository.findAll());
  }

  /** Returns a bank's health row (null when absent — no row is not an error). */
  async findByBankCode(bankCode: string): Promise<ScraperHealthRow | null> {
    return this.scraperHealthRepository.findByBankCode(bankCode);
  }

  /** Shared filter: rows whose categorized status equals the bucket. */
  private async listByBucket(bucket: ScraperBucket): Promise<ScraperHealthRow[]> {
    const rows = await this.scraperHealthRepository.findAll();
    return sortByBankCode(rows.filter((row) => categorizeScraperStatus(row.status) === bucket));
  }
}
