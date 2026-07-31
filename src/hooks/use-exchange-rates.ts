import { useQuery } from "@tanstack/react-query";
import { fetchExchangeRates } from "@/lib/api/exchange-rates";
import type { ExchangeRate } from "@/types/exchange-rate";

export const exchangeRateKeys = {
  all: ["exchange-rates"] as const,
  list: (currency?: string) => ["exchange-rates", { currency }] as const,
};

export function useExchangeRates(currency?: string) {
  return useQuery<ExchangeRate[]>({
    queryKey: exchangeRateKeys.list(currency),
    queryFn: () => fetchExchangeRates(currency),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}