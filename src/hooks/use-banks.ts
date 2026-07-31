import { useQuery } from "@tanstack/react-query";

import { fetchBankBySlug, fetchBanks, fetchCurrencies } from "@/lib/api/banks";
import { bankKeys, currencyKeys } from "@/lib/query-keys";
import { banks as demoBanks, currencies as demoCurrencies } from "@/lib/demo-data";
import type { Bank } from "@/types/bank";
import type { Currency } from "@/types/currency";

export function useBanks() {
  return useQuery<Bank[]>({
    queryKey: bankKeys.lists(),
    queryFn: fetchBanks,
    // Seed from mock data so the UI renders instantly (no loading flash).
    // Remove `initialData` once the backend is connected.
    initialData: demoBanks,
  });
}

export function useBankBySlug(slug?: string) {
  return useQuery<Bank | undefined>({
    queryKey: bankKeys.detail(slug),
    queryFn: () => fetchBankBySlug(slug),
    enabled: Boolean(slug),
    // Seed from mock data so the UI renders instantly.
    initialData: demoBanks.find((bank) => bank.slug === slug),
  });
}

export function useCurrencies() {
  return useQuery<Currency[]>({
    queryKey: currencyKeys.lists(),
    queryFn: fetchCurrencies,
    initialData: demoCurrencies,
  });
}
