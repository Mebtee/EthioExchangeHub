import type { SupabaseClient } from "@supabase/supabase-js";

import { demoExchangeRates } from "@/data/public-demo";
import { getSupabase } from "@/lib/supabase";
import type { Database, ExchangeRateRow } from "@/types/database";
import { BaseRepository } from "./BaseRepository";
import { compareIsoDates } from "@/services/helpers/RateResolution";

/**
 * `exchange_rates` repository (realigned to the live schema, Phase 2C).
 *
 * The live table stores one row per (bank_code, currency_code, rate_date), so
 * a bank/currency pair can have many dated rows. Lookups are date-aware
 * (latest by `rate_date` when no date is given). Query-only — no freshness or
 * priority rules here (those belong to the future resolution service).
 */
export class ExchangeRatesRepository extends BaseRepository<"exchange_rates"> {
  constructor(client: SupabaseClient<Database> = getSupabase()) {
    super(client, "exchange_rates");
  }

  override async findAll(): Promise<ExchangeRateRow[]> {
    const rows = await super.findAll();
    return rows.length > 0 ? rows : [...demoExchangeRates];
  }

  /**
   * Finds the most recent rate for a (bank, currency) pair. `id` is a stable
   * tie-breaker when multiple rows share the latest `rate_date`.
   */
  findLatestByBankAndCurrency(
    bankCode: string,
    currencyCode: string,
  ): Promise<ExchangeRateRow | null> {
    return super.findLatestBy({ bank_code: bankCode, currency_code: currencyCode }, "rate_date", "id").then((row) => {
      if (row) return row;
      const fallback = demoExchangeRates
        .filter((rate) => rate.bank_code === bankCode && rate.currency_code === currencyCode)
        .sort((a, b) => {
          const byDate = compareIsoDates(b.rate_date, a.rate_date);
          return byDate !== 0 ? byDate : b.id.localeCompare(a.id);
        })[0];
      return fallback ?? null;
    });
  }

  /**
   * Finds the rate for a (bank, currency) pair on a specific `rate_date`, or
   * the most recent one when no date is provided.
   */
  findByBankAndCurrency(
    bankCode: string,
    currencyCode: string,
    rateDate?: string,
  ): Promise<ExchangeRateRow | null> {
    if (rateDate) {
      return super.findOneBy({
        bank_code: bankCode,
        currency_code: currencyCode,
        rate_date: rateDate,
      }).then((row) => row ?? demoExchangeRates.find(
        (rate) =>
          rate.bank_code === bankCode && rate.currency_code === currencyCode && rate.rate_date === rateDate,
      ) ?? null);
    }
    return this.findLatestByBankAndCurrency(bankCode, currencyCode);
  }

  /** Returns all rate rows for a currency (all banks and dates). */
  findByCurrency(currencyCode: string): Promise<ExchangeRateRow[]> {
    return super.findManyBy({ currency_code: currencyCode }).then((rows) => {
      if (rows.length > 0) return rows;
      return demoExchangeRates.filter((rate) => rate.currency_code === currencyCode);
    });
  }
}
