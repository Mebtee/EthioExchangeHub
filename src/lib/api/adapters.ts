import { bankAccentClass } from "@/lib/bank";
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

export function mapBankRow(row: BackendBankRow): Bank {
  return {
    slug: row.bank_code,
    name: row.bank_name,
    short: row.bank_code,
    type: normalizeBankType(row.bank_type),
    color: bankAccentClass(row.bank_name),
    established: undefined,
    description: row.source_url ?? undefined,
    phone: undefined,
    email: undefined,
    hq: undefined,
    rating: undefined,
    reviews: undefined,
    branches: undefined,
  };
}

export function mapExchangeRateRow(
  row: BackendExchangeRateRow,
  bankName?: string,
): ExchangeRate {
  return {
    id: hashString(`${row.bank_code}:${row.currency_code}:${row.rate_date}:${row.scraped_at ?? ""}`),
    bankId: hashString(row.bank_code),
    bankCode: row.bank_code,
    bankName: bankName ?? row.bank_code,
    currency: row.currency_code,
    cashBuying: toDisplayRate(row.buying_rate),
    cashSelling: toDisplayRate(row.selling_rate),
    transactionBuying: toDisplayRate(row.transactional_buying ?? row.buying_rate),
    transactionSelling: toDisplayRate(row.transactional_selling ?? row.selling_rate),
    lastUpdated: row.scraped_at ?? `${row.rate_date}T00:00:00.000Z`,
    source: normalizeSource(row.source),
    logo: "",
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
