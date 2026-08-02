import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";
import type { Database, ManualRateRow } from "@/types/database";
import { BaseRepository } from "./BaseRepository";

/**
 * `manual_rates` repository (realigned to the live schema, Phase 2C).
 *
 * Human overrides keyed like exchange_rates (bank_code, currency_code,
 * rate_date). Lookups are date-aware (latest by `rate_date` when no date is
 * given). Query-only — override/priority decisions belong to the future
 * resolution service.
 */
export class ManualRatesRepository extends BaseRepository<"manual_rates"> {
  constructor(client: SupabaseClient<Database> = getSupabase()) {
    super(client, "manual_rates");
  }

  /**
   * Finds the most recent manual rate for a (bank, currency) pair. `id` is a
   * stable tie-breaker when multiple rows share the latest `rate_date`.
   */
  findLatestByBankAndCurrency(
    bankCode: string,
    currencyCode: string,
  ): Promise<ManualRateRow | null> {
    return this.findLatestBy(
      { bank_code: bankCode, currency_code: currencyCode },
      "rate_date",
      "id",
    );
  }

  /**
   * Finds the manual rate for a (bank, currency) pair on a specific
   * `rate_date`, or the most recent one when no date is provided.
   */
  findByBankAndCurrency(
    bankCode: string,
    currencyCode: string,
    rateDate?: string,
  ): Promise<ManualRateRow | null> {
    if (rateDate) {
      return this.findOneBy({
        bank_code: bankCode,
        currency_code: currencyCode,
        rate_date: rateDate,
      });
    }
    return this.findLatestByBankAndCurrency(bankCode, currencyCode);
  }
}
