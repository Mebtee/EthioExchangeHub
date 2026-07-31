import type {
  ExchangeRate,
  RankedExchangeRate,
  RateField,
} from "@/types/exchange-rate";

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

export function slugifyBankName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function bankInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

/** Deterministic avatar tint derived from the bank name (no hardcoded banks). */
export function bankAccentClass(name: string): string {
  const palette = [
    "bg-primary",
    "bg-red-700",
    "bg-blue-600",
    "bg-orange-500",
    "bg-emerald-700",
    "bg-green-700",
    "bg-yellow-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}

export function sourceLabel(source: string): string {
  if (!source) return "Bank";
  return source.charAt(0).toUpperCase() + source.slice(1);
}

export function getRate(rate: ExchangeRate, field: RateField): number {
  return rate[field];
}

export function formatRelativeTime(iso: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "—";
  const diff = Math.max(0, Date.now() - time);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
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
  const sortDirection =
    RATE_FIELDS.find((f) => f.key === field)?.direction ?? "desc";

  return rates
    .filter((rate) => (currency ? rate.currency === currency : true))
    .filter((rate) =>
      search ? rate.bankName.toLowerCase().includes(search) : true,
    )
    .filter((rate) => Number.isFinite(rate[field]))
    .sort((a, b) =>
      sortDirection === "desc" ? b[field] - a[field] : a[field] - b[field],
    )
    .map((rate, index) => ({
      ...rate,
      rank: index + 1,
      rate: getRate(rate, field),
    }));
}