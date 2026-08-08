import type { ExchangeRate } from "@/types/exchange-rate";

/**
 * Preferred display order for the ticker. This is ONLY an ordering preference —
 * a currency never appears unless it exists in the real API response, and no
 * rate value is ever invented here.
 */
const PREFERRED_CURRENCIES = ["USD", "EUR", "GBP", "AED", "SAR", "CAD", "AUD", "CHF", "CNY", "DJF"];

/** One scrolling ticker entry, derived entirely from resolved API rates. */
export interface MarketTickerItem {
  /** Display pair, e.g. "USD/ETB". */
  pair: string;
  /** Mean cash buying rate across banks on the currency's newest rate_date (null when absent). */
  buy: number | null;
  /** Mean cash selling rate across banks on the currency's newest rate_date (null when absent). */
  sell: number | null;
  /** The business date (rate_date) the shown rates are valid for — never scraped_at. */
  rateDate: string;
  /** Mean of the banks' rate_date-based percent change (null when no prior business date exists). */
  change: number | null;
}

/**
 * Builds the ticker from the SAME resolved rates the homepage/rankings use
 * (`/rates/latest`). For each currency it aggregates only the rows published
 * on that currency's NEWEST `rate_date` (banks that lag behind are excluded
 * rather than dragging the average), taking the mean cash buy/sell across
 * banks. Transactional values never contribute — a null cash side stays null.
 * The percent change is the mean of the banks' real rate_date-based changes,
 * or null (rendered as an em-dash) when no prior business date exists.
 */
export function buildMarketTicker(rates: ExchangeRate[]): MarketTickerItem[] {
  const byCurrency = new Map<string, ExchangeRate[]>();
  for (const rate of rates) {
    const list = byCurrency.get(rate.currency) ?? [];
    list.push(rate);
    byCurrency.set(rate.currency, list);
  }

  const items: MarketTickerItem[] = [];
  for (const [currency, rows] of byCurrency) {
    const newestDate = rows.reduce(
      (latest, row) => (row.rateDate > latest ? row.rateDate : latest),
      rows[0]!.rateDate,
    );
    const onDate = rows.filter((row) => row.rateDate === newestDate);

    const buy = finiteMean(onDate.map((row) => row.cashBuying));
    const sell = finiteMean(onDate.map((row) => row.cashSelling));
    if (buy === null && sell === null) continue;

    const change = finiteMean(
      onDate.map((row) => row.change).filter((c): c is number => c !== undefined),
    );

    items.push({ pair: `${currency}/ETB`, buy, sell, rateDate: newestDate, change });
  }

  return items.sort((left, right) => comparePreferred(left.pair, right.pair));
}

/** Mean of the finite values; null when none are finite. */
function finiteMean(values: number[]): number | null {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return null;
  const average = finite.reduce((sum, value) => sum + value, 0) / finite.length;
  return roundToTwo(average);
}

/** Orders preferred major pairs first, then the rest alphabetically. */
function comparePreferred(leftPair: string, rightPair: string): number {
  const left = leftPair.split("/")[0]!;
  const right = rightPair.split("/")[0]!;
  const leftRank = PREFERRED_CURRENCIES.indexOf(left);
  const rightRank = PREFERRED_CURRENCIES.indexOf(right);
  const leftScore = leftRank === -1 ? PREFERRED_CURRENCIES.length : leftRank;
  const rightScore = rightRank === -1 ? PREFERRED_CURRENCIES.length : rightRank;
  if (leftScore !== rightScore) return leftScore - rightScore;
  return left.localeCompare(right);
}

/** Two-decimal display precision for rates and changes. */
function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
