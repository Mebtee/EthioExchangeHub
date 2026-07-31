export type RateSource = "scraper" | "manual" | (string & {});

export interface ExchangeRate {
  id: number;
  bankId: number;
  bankName: string;
  currency: string;
  cashBuying: number;
  cashSelling: number;
  transactionalBuying: number;
  transactionalSelling: number;
  scrapedAt: string;
  source: RateSource;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export type RateField =
  "cashBuying" | "cashSelling" | "transactionalBuying" | "transactionalSelling";

export interface RankedExchangeRate extends ExchangeRate {
  rank: number;
  /** Value of the active ranking field for this row. */
  rate: number;
}
