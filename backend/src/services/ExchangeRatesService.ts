import { ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { ExchangeRatesRepository } from "@/repositories/ExchangeRatesRepository";
import { ManualRatesRepository } from "@/repositories/ManualRatesRepository";
import type { ExchangeRateRow, ManualRateRow } from "@/types/database";
import { todayLocalIso } from "@/utils/date";
import type { BanksService } from "./BanksService";
import {
  DEFAULT_MAX_RATE_AGE_DAYS,
  filterByDateRange,
  markStale,
  resolveLatestWithManualOverrides,
  type StaleMarked,
} from "./helpers/RateResolution";
import { sortByBankCodeAndCurrency, sortByRateDate } from "./helpers/Sorting";
import { assertCurrencyCode, assertIsoDate, isIsoDate } from "./helpers/Validation";

/** Inclusive `rate_date` range filter ("YYYY-MM-DD"). */
export interface RateDateRange {
  from?: string;
  to?: string;
}

/**
 * A resolved rate row annotated with its computed staleness flag (D2).
 * Stale rows are always served — never dropped — so consumers decide how to
 * present them. `change` (when present) is the percent move of the row's cash
 * buying rate against the previous resolved `rate_date` for the same
 * bank + currency — null when no prior business date exists, absent on
 * endpoints that do not compute it.
 */
export type ResolvedRateRow = StaleMarked<ExchangeRateRow> & { change?: number | null };

/** One aggregated trend point as served by `GET /admin/dashboard/rate-trend`. */
export interface RateTrendPoint {
  /** Rate date (YYYY-MM-DD). */
  label: string;
  /** Mean cash buying rate across all banks/currencies on that date. */
  cashBuying: number;
  /** Mean cash selling rate across all banks/currencies on that date. */
  cashSelling: number;
}

/** Inclusive `rate_date` bounds across all published rates, as served by `GET /rates/date-range`. */
export interface RateDateRangeBounds {
  /** Oldest `rate_date` present in the data (null when no rows exist). */
  min: string | null;
  /** Newest `rate_date` present in the data (null when no rows exist). */
  max: string | null;
}

/** Public contract of the exchange-rates service. */
export interface ExchangeRatesService {
  getLatestRates(range?: RateDateRange): Promise<ResolvedRateRow[]>;
  getLatestRatesByCurrency(currencyCode: string, range?: RateDateRange): Promise<ResolvedRateRow[]>;
  getLatestRatesByBank(bankCode: string, range?: RateDateRange): Promise<ResolvedRateRow[]>;
  getLatestRateByBankAndCurrency(
    bankCode: string,
    currencyCode: string,
  ): Promise<ResolvedRateRow | null>;
  getHistoricalRates(
    bankCode: string,
    currencyCode: string,
    range?: RateDateRange,
  ): Promise<ResolvedRateRow[]>;
  /**
   * The oldest and newest `rate_date` across all published rates (scraped +
   * manual), or nulls when no rows exist. Used by clients to bound date
   * pickers to the range of data that actually exists.
   */
  getDateRange(): Promise<RateDateRangeBounds>;
  /**
   * Cash buying/selling trend aggregated by rate date (newest `days` points,
   * optionally for one currency only).
   */
  getRateTrend(days?: number, currency?: string): Promise<RateTrendPoint[]>;
}

/**
 * Exchange-rate business logic. The repository returns every matching row;
 * this service resolves duplicates (one row per bank + currency), selects the
 * newest record, and applies date filtering and ordering.
 */
export class ExchangeRatesServiceImpl implements ExchangeRatesService {
  constructor(
    private readonly exchangeRatesRepository: ExchangeRatesRepository,
    private readonly banksService: BanksService,
    private readonly manualRatesRepository: ManualRatesRepository,
    /**
     * Staleness window in days (D2). Injected by the composition root from
     * `env.MAX_RATE_AGE_DAYS`; a `today` provider is injected too so the
     * wall clock never leaks into unit tests.
     */
    private readonly maxRateAgeDays: number = DEFAULT_MAX_RATE_AGE_DAYS,
    private readonly todayProvider: () => string = todayLocalIso,
  ) {}

  /**
   * Resolved snapshot: one (newest) row per bank + currency, ordered by code.
   * Manual overrides participate: for the same (bank, currency) the newest
   * rate_date wins, and a manual override wins a date tie. Every row is
   * annotated with `stale`; stale rows are served, never dropped.
   *
   * When `to` is provided, only rows whose `rate_date` equals that day are
   * returned — a bank that did not publish that day is excluded, never
   * replaced by an older rate.
   */
  async getLatestRates(range?: RateDateRange): Promise<ResolvedRateRow[]> {
    this.validateRange(range);
    const all = await this.combinedRows();
    const rows = this.filterLatestRange(all, range);
    const resolved = sortByBankCodeAndCurrency(
      resolveLatestWithManualOverrides(rows, (r) => `${r.bank_code}\u0000${r.currency_code}`),
    );
    return this.withChange(this.markAllStale(resolved), all);
  }

  /** Resolved rates for one currency (newest per bank), manual overrides applied. */
  async getLatestRatesByCurrency(
    currencyCode: string,
    range?: RateDateRange,
  ): Promise<ResolvedRateRow[]> {
    assertCurrencyCode(currencyCode);
    this.validateRange(range);
    const all = await this.combinedRows();
    const rows = this.filterLatestRange(all, range).filter((r) => r.currency_code === currencyCode);
    const resolved = sortByBankCodeAndCurrency(
      resolveLatestWithManualOverrides(rows, (r) => r.bank_code),
    );
    return this.withChange(this.markAllStale(resolved), all);
  }

  /** Resolved rates for one bank (newest per currency), manual overrides applied. */
  async getLatestRatesByBank(bankCode: string, range?: RateDateRange): Promise<ResolvedRateRow[]> {
    await this.banksService.validateBankExists(bankCode);
    this.validateRange(range);
    const all = await this.combinedRows();
    const rows = this.filterLatestRange(all, range).filter((r) => r.bank_code === bankCode);
    const resolved = resolveLatestWithManualOverrides(rows, (r) => r.currency_code);
    const sorted = [...resolved].sort((a, b) => a.currency_code.localeCompare(b.currency_code));
    return this.withChange(this.markAllStale(sorted), all);
  }

  /**
   * The newest rate for a single bank + currency (manual override wins a date
   * tie), or null when neither source has a row.
   */
  async getLatestRateByBankAndCurrency(
    bankCode: string,
    currencyCode: string,
  ): Promise<ResolvedRateRow | null> {
    await this.banksService.validateBankExists(bankCode);
    assertCurrencyCode(currencyCode);
    const [scraped, manual] = await Promise.all([
      this.exchangeRatesRepository.findLatestByBankAndCurrency(bankCode, currencyCode),
      this.manualRatesRepository.findLatestByBankAndCurrency(bankCode, currencyCode),
    ]);
    const rows = [
      ...(scraped ? [scraped] : []),
      ...(manual ? [ExchangeRatesServiceImpl.toRateRow(manual)] : []),
    ];
    if (rows.length === 0) return null;
    const winner = resolveLatestWithManualOverrides(rows, () => "")[0];
    if (!winner) return null;
    const [marked] = this.markAllStale([winner]);
    return marked ?? null;
  }

  /** Annotates rows with `stale` per the configured age window (additive only). */
  private markAllStale(rows: ExchangeRateRow[]): ResolvedRateRow[] {
    return markStale(rows, this.todayProvider(), this.maxRateAgeDays);
  }

  /**
   * Annotates every resolved row with `change`: the percent move of its cash
   * buying rate against the previous resolved `rate_date` for the same
   * bank + currency. The comparison is derived from the SAME rows that feed
   * resolution (`all`), using the same manual-override-aware resolver — not a
   * second algorithm. `change` is null when the row has no buying rate or no
   * prior business date exists (never a fabricated 0%). The `rate_date` is
   * the business date; `scraped_at` never participates.
   */
  private withChange(rows: ResolvedRateRow[], all: ExchangeRateRow[]): ResolvedRateRow[] {
    const history = this.pairBuyingHistory(all);
    return rows.map((row) => {
      let change: number | null = null;
      if (row.buying_rate !== null) {
        const byDate = history.get(`${row.bank_code}\u0000${row.currency_code}`);
        if (byDate) {
          const dates = [...byDate.keys()].sort();
          const index = dates.indexOf(row.rate_date);
          if (index > 0) {
            const previous = byDate.get(dates[index - 1]!);
            if (previous !== undefined && previous > 0) {
              change = roundToTwo(((row.buying_rate - previous) / previous) * 100);
            }
          }
        }
      }
      return { ...row, change };
    });
  }

  /**
   * Per (bank, currency): the resolved cash buying rate for every `rate_date`
   * present. Rows on the same date are reduced to one winner with the shared
   * resolver, so manual overrides win a date tie exactly as they do for the
   * latest snapshot — keeping `change` consistent with resolution.
   */
  private pairBuyingHistory(all: ExchangeRateRow[]): Map<string, Map<string, number>> {
    const grouped = new Map<string, ExchangeRateRow[]>();
    for (const row of all) {
      const key = `${row.bank_code}\u0000${row.currency_code}`;
      const list = grouped.get(key);
      if (list) list.push(row);
      else grouped.set(key, [row]);
    }

    const history = new Map<string, Map<string, number>>();
    for (const [pair, rows] of grouped) {
      const winnerByDate = resolveLatestWithManualOverrides(rows, (r) => r.rate_date);
      const byDate = new Map<string, number>();
      for (const winner of winnerByDate) {
        if (winner.buying_rate !== null) byDate.set(winner.rate_date, winner.buying_rate);
      }
      history.set(pair, byDate);
    }
    return history;
  }

  /**
   * Scraped + manual rows combined in the shared rate-row shape. Scraped rows
   * with a malformed `rate_date` are excluded and logged (data-quality
   * tripwire) — they are not reliably comparable and could otherwise win
   * resolution by string comparison.
   */ private async combinedRows(): Promise<ExchangeRateRow[]> {
    const [scraped, manual] = await Promise.all([
      this.exchangeRatesRepository.findAll(),
      this.manualRatesRepository.findAll(),
    ]);

    const validScraped = scraped.filter((row) => isIsoDate(row.rate_date));
    const malformed = Array.from(
      new Set(scraped.map((row) => row.rate_date).filter((date) => !isIsoDate(date))),
    );
    // Warn once per distinct malformed value per process — a poisoned row
    // shouldn't re-log on every public request, but new bad values must surface.
    for (const date of malformed) {
      if (!warnedMalformedDates.has(date)) {
        warnedMalformedDates.add(date);
        logger.warn("Exchange-rate row carries a malformed rate_date and was excluded", {
          rate_date: date,
          retainedCount: validScraped.length,
        });
      }
    }

    return [...validScraped, ...manual.map((row) => ExchangeRatesServiceImpl.toRateRow(row))];
  }

  /**
   * Converts a manual-rate row into the shared rate-row shape so overrides can
   * participate in resolution. Cash and transactional columns map 1:1 from the
   * manual row — a null transactional value stays null and is never conflated
   * with the cash rates.
   */
  private static toRateRow(manual: ManualRateRow): ExchangeRateRow {
    return {
      id: manual.id,
      bank_code: manual.bank_code,
      currency_code: manual.currency_code,
      buying_rate: manual.buying_rate,
      selling_rate: manual.selling_rate,
      transactional_buying: manual.transactional_buying,
      transactional_selling: manual.transactional_selling,
      weighted_avg_buying: null,
      weighted_avg_selling: null,
      rate_date: manual.rate_date,
      source: "MANUAL",
      scraped_at: null,
    };
  }

  /**
   * Full dated history for a bank + currency, oldest first. Manual overrides
   * participate (D1): one row per `rate_date`, and a manual override wins a
   * same-date tie — so the history stays consistent with the resolved latest
   * snapshot instead of silently diverging.
   */
  async getHistoricalRates(
    bankCode: string,
    currencyCode: string,
    range?: RateDateRange,
  ): Promise<ResolvedRateRow[]> {
    await this.banksService.validateBankExists(bankCode);
    this.validateRange(range);
    const rows = filterByDateRange(await this.combinedRows(), range).filter(
      (r) => r.bank_code === bankCode && r.currency_code === currencyCode,
    );
    return this.markAllStale(
      sortByRateDate(
        resolveLatestWithManualOverrides(rows, (r) => r.rate_date),
        true,
      ),
    );
  }

  /**
   * Oldest and newest `rate_date` across the shared (scraped + manual) rows.
   * Returns nulls when there is no published data so the client can disable
   * the date picker instead of showing a bogus range.
   */
  async getDateRange(): Promise<RateDateRangeBounds> {
    const rows = await this.combinedRows();
    if (rows.length === 0) return { min: null, max: null };
    let min = rows[0]!.rate_date;
    let max = rows[0]!.rate_date;
    for (const row of rows) {
      if (row.rate_date < min) min = row.rate_date;
      if (row.rate_date > max) max = row.rate_date;
    }
    return { min, max };
  }

  /**
   * Cash buying/selling trend, one point per `rate_date` (mean of the non-null
   * rates on that date), oldest first. Rows can be narrowed to one currency so
   * e.g. the dashboard's "USD / ETB" chart never mixes other currencies into
   * the average. Only the newest `days` points are returned (default 30). Real
   * data only — a date with no non-null rates is never fabricated.
   */
  async getRateTrend(days?: number, currency?: string): Promise<RateTrendPoint[]> {
    if (currency) assertCurrencyCode(currency);
    const rows = await this.exchangeRatesRepository.findAll();
    const byDate = new Map<string, { buying: number[]; selling: number[] }>();
    for (const row of rows) {
      if (currency && row.currency_code !== currency) continue;
      const bucket = byDate.get(row.rate_date) ?? { buying: [], selling: [] };
      if (row.buying_rate !== null) bucket.buying.push(row.buying_rate);
      if (row.selling_rate !== null) bucket.selling.push(row.selling_rate);
      byDate.set(row.rate_date, bucket);
    }

    const points: RateTrendPoint[] = [...byDate.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([label, bucket]) => ({
        label,
        cashBuying: roundToTwo(mean(bucket.buying)),
        cashSelling: roundToTwo(mean(bucket.selling)),
      }))
      .filter((point) => point.cashBuying > 0 || point.cashSelling > 0);

    const limit = days !== undefined && days > 0 ? days : DEFAULT_TREND_DAYS;
    return points.slice(-limit);
  }

  /**
   * Filters rows for a "latest snapshot" query. A `to` date is an exact-day
   * match (`rate_date === to`): a bank that did not publish on that day is
   * excluded entirely rather than falling back to an older rate. `from`, when
   * present, still acts as an inclusive lower bound.
   */
  private filterLatestRange<T extends { rate_date: string }>(
    rows: T[],
    range?: RateDateRange,
  ): T[] {
    return rows.filter((row) => {
      if (range?.from && row.rate_date < range.from) return false;
      if (range?.to && row.rate_date !== range.to) return false;
      return true;
    });
  }

  /** Validates an optional date range: ISO format and `from` before-or-equal `to`. */
  private validateRange(range?: RateDateRange): void {
    if (range?.from) assertIsoDate(range.from);
    if (range?.to) assertIsoDate(range.to);
    if (range?.from && range?.to && range.from > range.to) {
      throw new ValidationError(
        `Invalid date range: "from" (${range.from}) is after "to" (${range.to}).`,
      );
    }
  }
}

/** Default trend window: the newest 30 rate dates. */
const DEFAULT_TREND_DAYS = 30;

/**
 * Malformed `rate_date` values already warned about in this process. Guards
 * the data-quality tripwire in `combinedRows` so a single poisoned row cannot
 * re-log on every public request (one warn per distinct value per process).
 */
const warnedMalformedDates = new Set<string>();

/** Arithmetic mean of a list; 0 when empty. */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Rounds to two decimals (display precision for rates). */
function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
