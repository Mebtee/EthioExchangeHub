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
 * present them.
 */
export type ResolvedRateRow = StaleMarked<ExchangeRateRow>;

/** One aggregated trend point as served by `GET /admin/dashboard/rate-trend`. */
export interface RateTrendPoint {
  /** Rate date (YYYY-MM-DD). */
  label: string;
  /** Mean cash buying rate across all banks/currencies on that date. */
  cashBuying: number;
  /** Mean cash selling rate across all banks/currencies on that date. */
  cashSelling: number;
}

/** One market-ticker row as served by `GET /market-ticker`. */
export interface MarketTickerItem {
  /** Display pair (e.g. "USD/ETB"). */
  pair: string;
  /** Mean cash buying rate across banks on the newest rate date. */
  value: number;
  /** Percent change vs the previous rate date (0 when there is no history). */
  change: number;
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
   * Cash buying/selling trend aggregated by rate date (newest `days` points,
   * optionally for one currency only).
   */
  getRateTrend(days?: number, currency?: string): Promise<RateTrendPoint[]>;
  /**
   * Market ticker: mean cash buying rate per currency on the newest rate
   * date, with the percent change vs the previous date. Derived entirely from
   * the persisted rows — never fabricated.
   */
  getMarketTicker(limit?: number): Promise<MarketTickerItem[]>;
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
   */
  async getLatestRates(range?: RateDateRange): Promise<ResolvedRateRow[]> {
    this.validateRange(range);
    const rows = filterByDateRange(await this.combinedRows(), range);
    return this.markAllStale(
      sortByBankCodeAndCurrency(
        resolveLatestWithManualOverrides(rows, (r) => `${r.bank_code}\u0000${r.currency_code}`),
      ),
    );
  }

  /** Resolved rates for one currency (newest per bank), manual overrides applied. */
  async getLatestRatesByCurrency(
    currencyCode: string,
    range?: RateDateRange,
  ): Promise<ResolvedRateRow[]> {
    assertCurrencyCode(currencyCode);
    this.validateRange(range);
    const rows = filterByDateRange(await this.combinedRows(), range).filter(
      (r) => r.currency_code === currencyCode,
    );
    return this.markAllStale(
      sortByBankCodeAndCurrency(resolveLatestWithManualOverrides(rows, (r) => r.bank_code)),
    );
  }

  /** Resolved rates for one bank (newest per currency), manual overrides applied. */
  async getLatestRatesByBank(bankCode: string, range?: RateDateRange): Promise<ResolvedRateRow[]> {
    await this.banksService.validateBankExists(bankCode);
    this.validateRange(range);
    const rows = filterByDateRange(await this.combinedRows(), range).filter(
      (r) => r.bank_code === bankCode,
    );
    const resolved = resolveLatestWithManualOverrides(rows, (r) => r.currency_code);
    return this.markAllStale(
      [...resolved].sort((a, b) => a.currency_code.localeCompare(b.currency_code)),
    );
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
   * participate in resolution. Transactional/weighted columns are absent for
   * manual entries and stay null — never conflated with cash rates.
   */
  private static toRateRow(manual: ManualRateRow): ExchangeRateRow {
    return {
      id: manual.id,
      bank_code: manual.bank_code,
      currency_code: manual.currency_code,
      buying_rate: manual.buying_rate,
      selling_rate: manual.selling_rate,
      transactional_buying: null,
      transactional_selling: null,
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
   * Market ticker derived from real rows (manual overrides included): for
   * each currency, the mean cash buying rate across banks on the NEWEST rate
   * date, plus the percent change against the previous distinct rate date.
   * Currencies with no previous date report `change: 0`. Sorted by pair,
   * capped at `limit` (default 8). No values are invented — a currency only
   * appears when at least one bank reports a buying rate.
   */
  async getMarketTicker(limit?: number): Promise<MarketTickerItem[]> {
    const rows = await this.combinedRows();
    const byCurrency = new Map<string, Map<string, number[]>>();
    for (const row of rows) {
      if (row.buying_rate === null) continue;
      const dates = byCurrency.get(row.currency_code) ?? new Map<string, number[]>();
      const values = dates.get(row.rate_date) ?? [];
      values.push(row.buying_rate);
      dates.set(row.rate_date, values);
      byCurrency.set(row.currency_code, dates);
    }

    const items: MarketTickerItem[] = [];
    for (const [currency, dates] of byCurrency) {
      const sorted = [...dates.entries()].sort(([left], [right]) => left.localeCompare(right));
      const latest = sorted[sorted.length - 1];
      if (!latest) continue;
      const value = mean(latest[1]);
      let change = 0;
      const previous = sorted[sorted.length - 2];
      if (previous && previous[1].length > 0) {
        const previousValue = mean(previous[1]);
        if (previousValue > 0) change = ((value - previousValue) / previousValue) * 100;
      }
      items.push({ pair: `${currency}/ETB`, value: roundToTwo(value), change: roundToTwo(change) });
    }

    items.sort((left, right) => left.pair.localeCompare(right.pair));
    return items.slice(0, limit !== undefined && limit > 0 ? limit : DEFAULT_TICKER_LIMIT);
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

/** Default market-ticker length: the first 8 currency pairs (alphabetical). */
const DEFAULT_TICKER_LIMIT = 8;

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
