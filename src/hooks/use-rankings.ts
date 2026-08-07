import { useMemo, useState } from "react";
import { useExchangeRates } from "./use-exchange-rates";
import { buildRankings, getCurrencyOptions } from "@/lib/rankings";
import type { ExchangeRate, RateField } from "@/types/exchange-rate";

export function useRankings() {
  const [field, setField] = useState<RateField>("cashBuying");
  const [currency, setCurrency] = useState<string>("");
  const [query, setQuery] = useState("");
  const [asOfDate, setAsOfDate] = useState<string>("");

  const { data, isLoading, isError, error, refetch, isFetching } = useExchangeRates(
    undefined,
    asOfDate,
  );

  /**
   * Rankings only ever reflect a single day. When a date is selected the API
   * already enforces exact-day rows; when none is selected, rows are narrowed
   * to the newest rate_date present so banks that did not publish on the
   * latest day are excluded instead of falling back to an older rate.
   */
  const rates = useMemo(() => {
    const all = data ?? [];
    if (all.length === 0) return all;
    const newest = all.reduce<ExchangeRate>(
      (max, rate) => (rate.rateDate > max.rateDate ? rate : max),
      all[0]!,
    ).rateDate;
    return all.filter((rate) => rate.rateDate === newest);
  }, [data]);
  const currencies = useMemo(() => getCurrencyOptions(rates), [rates]);

  const activeCurrency =
    currency && currencies.includes(currency) ? currency : (currencies[0] ?? "");

  const rankings = useMemo(
    () => buildRankings(rates, { field, currency: activeCurrency, query }),
    [rates, field, activeCurrency, query],
  );

  /**
   * Every filtered rate record is ranked by buildRankings, so the ranking
   * count is the total of banks with a published rate for the active
   * field, currency, and search.
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
    rankings,
    totalBanks,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  };
}
