import { useQuery } from "@tanstack/react-query";

import { fetchBankBySlug, fetchBanks, fetchCurrencies } from "@/lib/api/banks";
import { bankKeys, currencyKeys } from "@/lib/query-keys";
import type { Bank } from "@/types/bank";
import type { Currency } from "@/types/currency";

export function useBanks() {
  return useQuery<Bank[]>({
    queryKey: bankKeys.lists(),
    queryFn: fetchBanks,
  });
}

export function useBankBySlug(slug?: string) {
  return useQuery<Bank | undefined>({
    queryKey: bankKeys.detail(slug),
    queryFn: () => fetchBankBySlug(slug),
    enabled: Boolean(slug),
  });
}

export function useCurrencies() {
  return useQuery<Currency[]>({
    queryKey: currencyKeys.lists(),
    queryFn: fetchCurrencies,
  });
}
