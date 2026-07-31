import { useMemo, useState } from "react";
import { useExchangeRates } from "./use-exchange-rates";
import { buildRankings, getCurrencyOptions } from "@/lib/rankings";
import type { RateField } from "@/types/exchange-rate";

export function useRankings() {
  const [field, setField] = useState<RateField>("cashBuying");
  const [currency, setCurrency] = useState<string>("");
  const [query, setQuery] = useState("");

  const { data, isLoading, isError, error, refetch, isFetching } = useExchangeRates();

  const rates = useMemo(() => data ?? [], [data]);
  const currencies = useMemo(() => getCurrencyOptions(rates), [rates]);

  const activeCurrency =
    currency && currencies.includes(currency) ? currency : (currencies[0] ?? "");

  const rankings = useMemo(
    () => buildRankings(rates, { field, currency: activeCurrency, query }),
    [rates, field, activeCurrency, query],
  );

  const search = query.trim().toLowerCase();

  /** Banks with a published rate for the active field, currency, and search. */
  const totalBanks = useMemo(
    () =>
      rates.filter(
        (r) =>
          (activeCurrency ? r.currency === activeCurrency : true) &&
          Number.isFinite(r[field]) &&
          (search ? r.bankName.toLowerCase().includes(search) : true),
      ).length,
    [rates, activeCurrency, field, search],
  );

  return {
    field,
    setField,
    currency: activeCurrency,
    setCurrency,
    query,
    setQuery,
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
