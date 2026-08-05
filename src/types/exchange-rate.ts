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
