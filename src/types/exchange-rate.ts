export type RateSource = "scraper" | "manual" | (string & {});

/** Fields shared by every rate record (public exchange rates and admin manual rates). */
export interface RateRecord {
  bankName: string;
  currency: string;
  cashBuying: number;
  cashSelling: number;
  transactionBuying: number;
  transactionSelling: number;
  lastUpdated: string;
  source: RateSource;
}

export interface ExchangeRate extends RateRecord {
  id: number;
  bankId: number;
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
