export type RateSource = "scraper" | "manual" | (string & {});

/** Fields shared by every rate record (public exchange rates and admin manual rates). */
export interface RateRecord {
  bankName: string;
  currency: string;
  cashBuying: number;
  cashSelling: number;
  transactionBuying: number;
  transactionSelling: number;
  rateDate: string;
  source: RateSource;
  /**
   * Computed freshness flag (D2): true when the rate_date is older than the
   * backend's MAX_RATE_AGE_DAYS window. Stale rows are still served — views
   * decide how to show them (hero may exclude, rankings may badge).
   */
  stale: boolean;
}

export interface ExchangeRate extends RateRecord {
  id: number;
  bankId: number;
  bankCode?: string;
  /** Bank logo URL (empty string when the bank has no logo). */
  logo: string;
  /**
   * Percent move of the cash buying rate vs the previous resolved rate_date
   * for the same bank + currency (undefined when the API does not provide it,
   * e.g. a row with no prior business date). Never fabricated on the client.
   */
  change?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export type RateField = "cashBuying" | "cashSelling" | "transactionBuying" | "transactionSelling";

export interface RankedExchangeRate extends ExchangeRate {
  rank: number;
  /** Value of the active ranking field for this row. */
  rate: number;
}

/** The oldest and newest rate_date across all published rates (YYYY-MM-DD), null when empty. */
export interface RateDateRange {
  min: string | null;
  max: string | null;
}
