import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";
import type { Database, ExchangeRateRow } from "@/types/database";
import { BaseRepository } from "./BaseRepository";

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

  /**
   * Finds the most recent rate for a (bank, currency) pair. `id` is a stable
   * tie-breaker when multiple rows share the latest `rate_date`.
   */
  findLatestByBankAndCurrency(
    bankCode: string,
    currencyCode: string,
  ): Promise<ExchangeRateRow | null> {
    return this.findLatestBy(
      { bank_code: bankCode, currency_code: currencyCode },
      "rate_date",
      "id",
    );
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
      return this.findOneBy({
        bank_code: bankCode,
        currency_code: currencyCode,
        rate_date: rateDate,
      });
    }
    return this.findLatestByBankAndCurrency(bankCode, currencyCode);
  }

  /** Returns all rate rows for a currency (all banks and dates). */
  findByCurrency(currencyCode: string): Promise<ExchangeRateRow[]> {
    return this.findManyBy({ currency_code: currencyCode });
  }
}
