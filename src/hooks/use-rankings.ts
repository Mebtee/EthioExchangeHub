import { useMemo, useState } from "react";
import { useExchangeRates } from "./use-exchange-rates";
import {
  buildRankings,
  filterToLatestBusinessDay,
  getCurrencyOptions,
  getLatestBusinessDate,
} from "@/lib/rankings";
import type { RateField } from "@/types/exchange-rate";

export function useRankings() {
  const [field, setField] = useState<RateField>("cashBuying");
  const [currency, setCurrency] = useState<string>("");
  const [query, setQuery] = useState("");
  const [asOfDate, setAsOfDate] = useState<string>("");

  const { data, isLoading, isError, error, refetch, isFetching } = useExchangeRates(
    undefined,
    asOfDate,
  );

  const allRates = useMemo(() => data ?? [], [data]);
  const currencies = useMemo(() => getCurrencyOptions(allRates), [allRates]);

  const activeCurrency =
    currency && currencies.includes(currency) ? currency : (currencies[0] ?? "");

  /**
   * Today's ranking is a single-day comparison. When no date is selected the
   * shared `useExchangeRates` hook dedupes to the newest record per
   * bank + currency (which can span several rate dates), so rows are narrowed
   * to the active currency's latest business date — banks that did not publish
   * on that day are excluded instead of ranking on an older rate. Selecting a
   * date keeps exact-day rows (already enforced by the API).
   */
  const rates = useMemo(
    () => (asOfDate ? allRates : filterToLatestBusinessDay(allRates, activeCurrency)),
    [allRates, asOfDate, activeCurrency],
  );

  const latestBusinessDate = asOfDate ? asOfDate : getLatestBusinessDate(allRates, activeCurrency);

  const rankings = useMemo(
    () => buildRankings(rates, { field, currency: activeCurrency, query }),
    [rates, field, activeCurrency, query],
  );

  /**
   * Every filtered rate record is ranked by buildRankings, so the ranking
   * count is the total of banks with a published rate on the active currency's
   * business day for the active field, currency, and search.
   */
  const totalBanks = rankings.length;

  return {
    field,
    setField,
    currency: activeCurrency,
    setCurrency,
    query,
    setQuery,
    asOfDate,
    setAsOfDate,
    currencies,
    latestBusinessDate,
    rankings,
    totalBanks,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  };
}
