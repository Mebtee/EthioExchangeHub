import type { Currency } from '@prisma/client';

// ── Scrape Method ──────────────────────────────────────────────
export type ScrapeMethod = 'cheerio' | 'playwright' | 'pdf' | 'api' | 'ajax';

// ── Scraper Metadata ───────────────────────────────────────────
export interface ScraperMetadata {
  slug: string; // e.g. "cbe"
  name: string; // e.g. "Commercial Bank of Ethiopia"
  website: string; // e.g. "https://combanketh.et/exchange-rates"
  method: ScrapeMethod; // detected/provided method
  isActive: boolean;
  supportedCurrencies: Currency[];
}

// ── Raw Scraped Rate ───────────────────────────────────────────
export interface RawScrapedRate {
  currencyFrom: Currency;
  currencyTo: Currency;
  buyRate: number;
  sellRate: number;
  /** Original text as it appeared on the page (for audit) */
  rawText?: string;
}

// ── Scrape Result ──────────────────────────────────────────────
export interface ScrapeResult {
  success: boolean;
  bankId: string;
  bankSlug: string;
  sourceUrl: string;
  rates: RawScrapedRate[];
  rawHtml?: string;
  errorMessage?: string;
  durationMs: number;
  scrapeMethod: ScrapeMethod;
}

// ── Validation Result ──────────────────────────────────────────
export interface ValidationResult {
  passed: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
  expected?: unknown;
}

export interface ValidationWarning {
  field: string;
  message: string;
  value?: unknown;
}
