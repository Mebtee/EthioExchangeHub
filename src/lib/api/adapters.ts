import { bankAccentClass } from "@/lib/bank";
import type {
  LogStatus,
  ManualRate,
  ScrapeLog,
  ScraperHealthRow,
  ScraperStatus,
} from "@/types/admin";
import type { Bank } from "@/types/bank";
import type { Currency } from "@/types/currency";
import type { ExchangeRate } from "@/types/exchange-rate";

export interface BackendBankRow {
  bank_code: string;
  bank_name: string;
  bank_type: string;
  source_url: string | null;
  is_active: boolean | null;
  created_at: string | null;
  total_assets: number | null;
  total_deposite: number | null;
  total_branches: number | null;
  total_employee: number | null;
  ratio_loan_to_deposite: number | null;
  ratio_return_on_asset: number | null;
  ratio_return_on_equity: number | null;
  profit_before_tax: number | null;
  profit_after_tax: number | null;
  retained_earning: number | null;
  paid_up_capital: number | null;
  reserves: number | null;
  total_liabilities: number | null;
}

export interface BackendExchangeRateRow {
  id: string;
  bank_code: string;
  currency_code: string;
  buying_rate: number | null;
  selling_rate: number | null;
  transactional_buying: number | null;
  transactional_selling: number | null;
  weighted_avg_buying: number | null;
  weighted_avg_selling: number | null;
  rate_date: string;
  source: string | null;
  scraped_at: string | null;
  /** Computed freshness flag — always present on resolved rows (D2). */
  stale: boolean;
  /**
   * Percent move of the cash buying rate vs the previous resolved rate_date
   * for the same bank + currency (null when there is no prior business date).
   */
  change?: number | null;
}

export interface BackendManualRateRow {
  id: string;
  bank_code: string;
  currency_code: string;
  buying_rate: number | null;
  selling_rate: number | null;
  transactional_buying: number | null;
  transactional_selling: number | null;
  rate_date: string;
  entered_by: string | null;
  note: string | null;
  created_at: string | null;
}

export interface BackendScrapeLogRow {
  id: string;
  run_id: string;
  bank_code: string;
  status: string;
  scenario: string;
  currencies_count: number | null;
  error_message: string | null;
  duration_ms: number | null;
  ran_at: string | null;
}

export interface BackendScraperHealthSummary {
  total: number;
  healthy: number;
  degraded: number;
  failed: number;
  unknown: number;
  averageResponseTimeMs: number | null;
  averageConsecutiveFailures: number | null;
  /** Scrapers whose last_rate_date is missing or older than the window (D2). */
  staleCount: number;
}

export interface BackendScraperHealthRow {
  bank_code: string;
  status: string;
  consecutive_failures: number | null;
  last_success: string | null;
  last_failure: string | null;
  last_rate_date: string | null;
  response_time_ms: number | null;
  updated_at: string | null;
}

const CURRENCY_META: Record<string, { label: string; category: string }> = {
  USD: { label: "US Dollar", category: "Major" },
  EUR: { label: "Euro", category: "Major" },
  GBP: { label: "British Pound", category: "Major" },
  AED: { label: "UAE Dirham", category: "Regional" },
  SAR: { label: "Saudi Riyal", category: "Regional" },
  KES: { label: "Kenyan Shilling", category: "Regional" },
  CNY: { label: "Chinese Yuan", category: "Major" },
  JPY: { label: "Japanese Yen", category: "Major" },
  ETB: { label: "Ethiopian Birr", category: "Local" },
};

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function toDisplayRate(value: number | null): number {
  return typeof value === "number" ? value : Number.NaN;
}

function normalizeSource(source: string | null): string {
  return source?.trim().toLowerCase() || "scraper";
}

function normalizeBankType(value: string): Bank["type"] {
  return value === "state_owned" ? "State Owned" : "Private Bank";
}

/**
 * Maps the backend's free-text scraper status to the canonical bucket (D3):
 * healthy / degraded / failed / unknown. Mirrors `categorizeScraperStatus` on
 * the backend so both sides share one vocabulary.
 */
function toScraperStatus(status: string): ScraperStatus {
  const value = status.trim().toLowerCase();
  if (value === "healthy") return "healthy";
  if (value === "degraded") return "degraded";
  if (value === "failed") return "failed";
  return "unknown";
}

/**
 * Maps the backend's free-text scrape-log status to the canonical bucket
 * (D3): only `success` is success; everything else is `failed`. Mirrors
 * `categorizeLogStatus` on the backend so both sides share one vocabulary.
 */
function toLogStatus(status: string): LogStatus {
  return status.trim().toLowerCase() === "success" ? "success" : "failed";
}

/** Maps a nullable numeric DB column to an optional number (undefined = absent). */
function toOptionalNumber(value: number | null): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function mapBankRow(row: BackendBankRow): Bank {
  return {
    slug: row.bank_code,
    name: row.bank_name,
    short: row.bank_code,
    type: normalizeBankType(row.bank_type),
    color: bankAccentClass(row.bank_name),
    established: undefined,
    description: undefined,
    phone: undefined,
    email: undefined,
    hq: undefined,
    website: row.source_url ?? undefined,
    rating: undefined,
    reviews: undefined,
    branches: toOptionalNumber(row.total_branches),
    totalAssets: toOptionalNumber(row.total_assets),
    totalDeposits: toOptionalNumber(row.total_deposite),
    totalEmployees: toOptionalNumber(row.total_employee),
    loanToDepositRatio: toOptionalNumber(row.ratio_loan_to_deposite),
    returnOnAsset: toOptionalNumber(row.ratio_return_on_asset),
    returnOnEquity: toOptionalNumber(row.ratio_return_on_equity),
    profitBeforeTax: toOptionalNumber(row.profit_before_tax),
    profitAfterTax: toOptionalNumber(row.profit_after_tax),
    retainedEarnings: toOptionalNumber(row.retained_earning),
    paidUpCapital: toOptionalNumber(row.paid_up_capital),
    reserves: toOptionalNumber(row.reserves),
    totalLiabilities: toOptionalNumber(row.total_liabilities),
  };
}

export function mapExchangeRateRow(row: BackendExchangeRateRow, bankName?: string): ExchangeRate {
  return {
    // Keyed by business identity only — scraped_at is operational metadata and
    // must never influence identity, selection, ranking, filtering, or dates.
    id: hashString(`${row.bank_code}:${row.currency_code}:${row.rate_date}`),
    bankId: hashString(row.bank_code),
    bankCode: row.bank_code,
    bankName: bankName ?? row.bank_code,
    currency: row.currency_code,
    cashBuying: toDisplayRate(row.buying_rate),
    cashSelling: toDisplayRate(row.selling_rate),
    // Transactional rates are surfaced only when the backend actually reports
    // them — never faked by falling back to cash rates (D5). A null column
    // maps to NaN, which renders as an em-dash and is excluded from rankings.
    transactionBuying: toDisplayRate(row.transactional_buying),
    transactionSelling: toDisplayRate(row.transactional_selling),
    rateDate: row.rate_date,
    source: normalizeSource(row.source),
    // Always present on resolved rows (D2) — no fallback needed.
    stale: row.stale,
    // Real backend-computed move vs the previous business date, or undefined
    // when no prior date exists. Never invented here.
    change: row.change == null ? undefined : row.change,
    logo: "",
  };
}

export function mapManualRateRow(row: BackendManualRateRow, bankName?: string): ManualRate {
  return {
    id: row.id,
    bankCode: row.bank_code,
    bankName: bankName ?? row.bank_code,
    currency: row.currency_code,
    // Transactional values map 1:1 from the backend — a null column maps to
    // NaN (rendered as an em-dash), never faked from the cash rates.
    cashBuying: toDisplayRate(row.buying_rate),
    cashSelling: toDisplayRate(row.selling_rate),
    transactionBuying: toDisplayRate(row.transactional_buying),
    transactionSelling: toDisplayRate(row.transactional_selling),
    rateDate: row.rate_date,
    note: row.note,
    createdAt: row.created_at,
  };
}

export function mapScraperHealthRow(
  row: BackendScraperHealthRow,
  bankName?: string,
): ScraperHealthRow {
  return {
    bankCode: row.bank_code,
    bankName: bankName ?? row.bank_code,
    status: toScraperStatus(row.status),
    consecutiveFailures: row.consecutive_failures,
    lastSuccess: row.last_success,
    lastFailure: row.last_failure,
    lastRateDate: row.last_rate_date,
    responseTimeMs: row.response_time_ms,
    updatedAt: row.updated_at,
  };
}

export function mapScrapeLogRow(row: BackendScrapeLogRow, bankName?: string): ScrapeLog {
  return {
    id: row.id,
    runId: row.run_id,
    bankCode: row.bank_code,
    bankName: bankName ?? row.bank_code,
    status: toLogStatus(row.status),
    scenario: row.scenario,
    records: row.currencies_count ?? 0,
    durationMs: row.duration_ms ?? 0,
    message: row.error_message ?? row.scenario,
    ranAt: row.ran_at,
  };
}

export function mapCurrencyCode(code: string): Currency {
  const meta = CURRENCY_META[code] ?? {
    label: `${code} Currency`,
    category: "Other",
  };

  return {
    code,
    label: meta.label,
    category: meta.category,
  };
}

export function uniqueCurrencyCodes(rates: BackendExchangeRateRow[]): string[] {
  return Array.from(new Set(rates.map((rate) => rate.currency_code))).sort();
}
