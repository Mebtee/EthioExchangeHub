import { useQuery } from "@tanstack/react-query";

import { fetchExchangeRates } from "@/lib/api/exchange-rates";
import { dedupeLatestRates } from "@/lib/rankings";
import { exchangeRateKeys } from "@/lib/query-keys";
import type { ExchangeRate } from "@/types/exchange-rate";

export function useExchangeRates(currency?: string) {
  return useQuery<ExchangeRate[]>({
    queryKey: exchangeRateKeys.list(currency),
    queryFn: () => fetchExchangeRates(currency),
    select: dedupeLatestRates,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
