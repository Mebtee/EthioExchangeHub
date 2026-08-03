import { apiClient } from "./client";
import {
  mapBankRow,
  mapCurrencyCode,
  type BackendBankRow,
  type BackendExchangeRateRow,
  uniqueCurrencyCodes,
} from "./adapters";
import type { Bank } from "@/types/bank";
import type { Currency } from "@/types/currency";

export async function fetchBanks(): Promise<Bank[]> {
  const { data } = await apiClient.get<BackendBankRow[]>("/banks");
  return data.map(mapBankRow);
}

export async function fetchBankBySlug(slug?: string): Promise<Bank | undefined> {
  if (!slug) return undefined;
  const { data } = await apiClient.get<BackendBankRow>(`/banks/${encodeURIComponent(slug)}`);
  return mapBankRow(data);
}

export async function fetchCurrencies(): Promise<Currency[]> {
  const { data } = await apiClient.get<BackendExchangeRateRow[]>("/rates/latest");
  return uniqueCurrencyCodes(data).map(mapCurrencyCode);
}
