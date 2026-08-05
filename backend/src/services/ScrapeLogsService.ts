import { ScrapeLogsRepository } from "@/repositories/ScrapeLogsRepository";
import type { ScrapeLogRow } from "@/types/database";
import { categorizeLogStatus, type LogBucket } from "./helpers/Statistics";
import { sortLogsNewestFirst } from "./helpers/Sorting";

/** Optional filters for listing scrape logs. */
export interface ScrapeLogFilter {
  bankCode?: string;
  runId?: string;
  /** Canonical bucket (success | failed) — matched against categorized rows. */
  status?: LogBucket;
  scenario?: string;
}

/** Service-level pagination (limit/offset). HTTP query parsing is a later phase. */
export interface ScrapeLogQueryOptions {
  /** Maximum number of rows to return (unbounded when omitted). */
  limit?: number;
  /** Number of rows to skip before returning. Defaults to 0. */
  offset?: number;
}

/** Public contract of the scrape-logs service. */
export interface ScrapeLogsService {
  /** The most recent logs across all runs, newest first. */
  getLatestLogs(limit?: number): Promise<ScrapeLogRow[]>;
  /** Logs for one bank, newest first. */
  getLogsByBank(bankCode: string, options?: ScrapeLogQueryOptions): Promise<ScrapeLogRow[]>;
  /** Logs for one scraper run (all banks in the run), newest first. */
  getLogsByRun(runId: string, options?: ScrapeLogQueryOptions): Promise<ScrapeLogRow[]>;
  /** Logs matching the given filters, newest first, with service-level pagination. */
  listLogs(filter?: ScrapeLogFilter, options?: ScrapeLogQueryOptions): Promise<ScrapeLogRow[]>;
}

/**
 * Scrape-log business logic: newest-first ordering, filtering, and
 * service-level pagination. The repository only returns rows; all ordering,
 * filtering, and slicing decisions live here.
 */
export class ScrapeLogsServiceImpl implements ScrapeLogsService {
  constructor(private readonly scrapeLogsRepository: ScrapeLogsRepository) {}

  /** The most recent logs, newest first. */
  async getLatestLogs(limit?: number): Promise<ScrapeLogRow[]> {
    return this.listLogs(undefined, { limit });
  }

  /** Logs for one bank, newest first. */
  async getLogsByBank(bankCode: string, options?: ScrapeLogQueryOptions): Promise<ScrapeLogRow[]> {
    return this.listLogs({ bankCode }, options);
  }

  /** Logs for one run (all banks in that run), newest first. */
  async getLogsByRun(runId: string, options?: ScrapeLogQueryOptions): Promise<ScrapeLogRow[]> {
    return this.listLogs({ runId }, options);
  }

  /** Filters, orders newest-first, then applies limit/offset. */
  async listLogs(
    filter?: ScrapeLogFilter,
    options?: ScrapeLogQueryOptions,
  ): Promise<ScrapeLogRow[]> {
    const rows = await this.scrapeLogsRepository.findAll();
    const filtered = rows.filter((row) => {
      if (filter?.bankCode && row.bank_code !== filter.bankCode) return false;
      if (filter?.runId && row.run_id !== filter.runId) return false;
      // D3: compare the row's CANONICAL bucket, not raw free text — a row
      // stored as "error"/"failure" must match `status=failed`.
      if (filter?.status && categorizeLogStatus(row.status) !== filter.status) return false;
      if (filter?.scenario && row.scenario !== filter.scenario) return false;
      return true;
    });

    const sorted = sortLogsNewestFirst(filtered);
    const offset = Math.max(0, options?.offset ?? 0);
    const limit = options?.limit;
    return limit === undefined || limit < 0
      ? sorted.slice(offset)
      : sorted.slice(offset, offset + limit);
  }
}
