import { useQuery } from "@tanstack/react-query";

import { fetchExchangeRates } from "@/lib/api/exchange-rates";
import { dedupeLatestRates } from "@/lib/rankings";
import { exchangeRateKeys } from "@/lib/query-keys";
import type { ExchangeRate } from "@/types/exchange-rate";

export function useExchangeRates(currency?: string, asOfDate?: string) {
  return useQuery<ExchangeRate[]>({
    queryKey: exchangeRateKeys.list(currency, asOfDate),
    queryFn: () => fetchExchangeRates(currency, asOfDate),
    select: dedupeLatestRates,
    staleTime: 60_000,
    // Keeps the homepage ticker / rate tables fresh without manual refresh.
    // TanStack pauses interval refetching while the tab is hidden.
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
