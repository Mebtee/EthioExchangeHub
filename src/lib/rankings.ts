import type { ExchangeRate, RankedExchangeRate, RateField } from "@/types/exchange-rate";

export const RATE_FIELDS: ReadonlyArray<{
  key: RateField;
  label: string;
  shortLabel: string;
  /** Buying rates rank highest (desc), selling rates rank lowest (asc). */
  direction: "desc" | "asc";
}> = [
  { key: "cashBuying", label: "Cash Buying", shortLabel: "Cash Buy", direction: "desc" },
  { key: "cashSelling", label: "Cash Selling", shortLabel: "Cash Sell", direction: "asc" },
  {
    key: "transactionBuying",
    label: "Transactional Buying",
    shortLabel: "Trans. Buy",
    direction: "desc",
  },
  {
    key: "transactionSelling",
    label: "Transactional Selling",
    shortLabel: "Trans. Sell",
    direction: "asc",
  },
];

export function rateFieldLabel(field: RateField): string {
  return RATE_FIELDS.find((f) => f.key === field)?.label ?? field;
}

export function getRate(rate: ExchangeRate, field: RateField): number {
  return rate[field];
}

/**
 * Keeps the newest record per bank + currency pair, judged by `rateDate` only.
 * Same-date ties have already been resolved by the backend (manual override →
 * scraped_at → UUID), so the first occurrence is kept deterministically.
 * A no-op when the API already returns one record per pair (the intended design).
 */
export function dedupeLatestRates(rates: ExchangeRate[]): ExchangeRate[] {
  const byKey = new Map<string, ExchangeRate>();
  for (const r of rates) {
    const key = `${r.bankName}\u0000${r.currency}`;
    const existing = byKey.get(key);
    if (!existing || r.rateDate > existing.rateDate) {
      byKey.set(key, r);
    }
  }
  return Array.from(byKey.values());
}

export function getCurrencyOptions(rates: ExchangeRate[]): string[] {
  return Array.from(new Set(rates.map((r) => r.currency))).sort();
}

/**
 * Currency used for headline displays (best buy/sell, directory cards).
 * Prefers USD when present, otherwise the first currency returned by the API.
 */
export function getPrimaryCurrency(rates: ExchangeRate[]): string {
  const currencies = getCurrencyOptions(rates);
  return currencies.includes("USD") ? "USD" : (currencies[0] ?? "");
}

/** All rate records published by the given bank (matched by name). */
export function getRatesForBank(rates: ExchangeRate[], bankName: string): ExchangeRate[] {
  const name = bankName.trim().toLowerCase();
  return rates.filter((r) => r.bankName.trim().toLowerCase() === name);
}

/** Timestamp of the newest rate record across the list (undefined when empty). */
export function getLatestUpdate(rates: ExchangeRate[]): string | undefined {
  return rates.reduce<string | undefined>(
    (latest, r) => (!latest || r.rateDate > latest ? r.rateDate : latest),
    undefined,
  );
}

/**
 * Best (max or min) rate for a field among the given currency's records.
 * Returns undefined when no finite value exists.
 */
export function getBestRate(
  rates: ExchangeRate[],
  currency: string,
  field: RateField,
  direction: "max" | "min",
): ExchangeRate | undefined {
  const candidates = rates.filter((r) => r.currency === currency && Number.isFinite(r[field]));
  if (candidates.length === 0) return undefined;
  return candidates.reduce((best, r) =>
    direction === "max" ? (r[field] > best[field] ? r : best) : r[field] < best[field] ? r : best,
  );
}

export interface RankingFilters {
  field: RateField;
  currency?: string;
  query?: string;
}

export function buildRankings(
  rates: ExchangeRate[],
  { field, currency, query }: RankingFilters,
): RankedExchangeRate[] {
  const search = (query ?? "").trim().toLowerCase();
  const sortDirection = RATE_FIELDS.find((f) => f.key === field)?.direction ?? "desc";

  return rates
    .filter((rate) => (currency ? rate.currency === currency : true))
    .filter((rate) => (search ? rate.bankName.toLowerCase().includes(search) : true))
    .filter((rate) => Number.isFinite(rate[field]))
    .sort((a, b) => (sortDirection === "desc" ? b[field] - a[field] : a[field] - b[field]))
    .map((rate, index) => ({
      ...rate,
      rank: index + 1,
      rate: getRate(rate, field),
    }));
}
