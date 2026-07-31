export type RateSource = "scraper" | "manual" | (string & {});

export interface ExchangeRate {
  id: number;
  bankId: number;
  bankName: string;
  /** Bank logo URL (empty string when the bank has no logo). */
  logo: string;
  currency: string;
  cashBuying: number;
  cashSelling: number;
  transactionBuying: number;
  transactionSelling: number;
  lastUpdated: string;
  source: RateSource;
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
