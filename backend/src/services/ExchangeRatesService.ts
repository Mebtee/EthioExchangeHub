import { ValidationError } from "@/lib/errors";
import { ExchangeRatesRepository } from "@/repositories/ExchangeRatesRepository";
import type { ExchangeRateRow } from "@/types/database";
import type { BanksService } from "./BanksService";
import { filterByDateRange, resolveLatestPerKey } from "./helpers/RateResolution";
import { sortByBankCodeAndCurrency, sortByRateDate } from "./helpers/Sorting";
import { assertCurrencyCode, assertIsoDate } from "./helpers/Validation";

/** Inclusive `rate_date` range filter ("YYYY-MM-DD"). */
export interface RateDateRange {
  from?: string;
  to?: string;
}

/** Public contract of the exchange-rates service. */
export interface ExchangeRatesService {
  getLatestRates(range?: RateDateRange): Promise<ExchangeRateRow[]>;
  getLatestRatesByCurrency(currencyCode: string, range?: RateDateRange): Promise<ExchangeRateRow[]>;
  getLatestRatesByBank(bankCode: string, range?: RateDateRange): Promise<ExchangeRateRow[]>;
  getLatestRateByBankAndCurrency(
    bankCode: string,
    currencyCode: string,
  ): Promise<ExchangeRateRow | null>;
  getHistoricalRates(
    bankCode: string,
    currencyCode: string,
    range?: RateDateRange,
  ): Promise<ExchangeRateRow[]>;
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
  ) {}

  /** Resolved snapshot: one (newest) row per bank + currency, ordered by code. */
  async getLatestRates(range?: RateDateRange): Promise<ExchangeRateRow[]> {
    this.validateRange(range);
    const rows = filterByDateRange(await this.exchangeRatesRepository.findAll(), range);
    return sortByBankCodeAndCurrency(
      resolveLatestPerKey(rows, (r) => `${r.bank_code}\u0000${r.currency_code}`),
    );
  }

  /** Resolved rates for one currency (newest per bank). */
  async getLatestRatesByCurrency(
    currencyCode: string,
    range?: RateDateRange,
  ): Promise<ExchangeRateRow[]> {
    assertCurrencyCode(currencyCode);
    this.validateRange(range);
    const rows = filterByDateRange(
      await this.exchangeRatesRepository.findByCurrency(currencyCode),
      range,
    );
    return sortByBankCodeAndCurrency(resolveLatestPerKey(rows, (r) => r.bank_code));
  }

  /** Resolved rates for one bank (newest per currency). */
  async getLatestRatesByBank(bankCode: string, range?: RateDateRange): Promise<ExchangeRateRow[]> {
    await this.banksService.validateBankExists(bankCode);
    this.validateRange(range);
    const rows = (await this.exchangeRatesRepository.findAll()).filter(
      (r) => r.bank_code === bankCode,
    );
    const resolved = resolveLatestPerKey(rows, (r) => r.currency_code);
    return [...resolved].sort((a, b) => a.currency_code.localeCompare(b.currency_code));
  }

  /** The newest rate for a single bank + currency, or null when none exists. */
  async getLatestRateByBankAndCurrency(
    bankCode: string,
    currencyCode: string,
  ): Promise<ExchangeRateRow | null> {
    await this.banksService.validateBankExists(bankCode);
    assertCurrencyCode(currencyCode);
    return this.exchangeRatesRepository.findLatestByBankAndCurrency(bankCode, currencyCode);
  }

  /** Full dated history for a bank + currency, oldest first. */
  async getHistoricalRates(
    bankCode: string,
    currencyCode: string,
    range?: RateDateRange,
  ): Promise<ExchangeRateRow[]> {
    await this.banksService.validateBankExists(bankCode);
    this.validateRange(range);
    const rows = (await this.exchangeRatesRepository.findAll()).filter(
      (r) => r.bank_code === bankCode && r.currency_code === currencyCode,
    );
    return sortByRateDate(filterByDateRange(rows, range), true);
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
