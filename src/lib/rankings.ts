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
    key: "transactionalBuying",
    label: "Transactional Buying",
    shortLabel: "Trans. Buy",
    direction: "desc",
  },
  {
    key: "transactionalSelling",
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

export function getCurrencyOptions(rates: ExchangeRate[]): string[] {
  return Array.from(new Set(rates.map((r) => r.currency))).sort();
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
