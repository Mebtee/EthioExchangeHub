import { apiClient } from "./client";
import type { Bank } from "@/types/bank";
import type { Currency } from "@/types/currency";

export async function fetchBanks(): Promise<Bank[]> {
  const { data } = await apiClient.get<Bank[]>("/banks");
  return data;
}

export async function fetchBankBySlug(slug?: string): Promise<Bank | undefined> {
  if (!slug) return undefined;
  const { data } = await apiClient.get<Bank>(`/banks/${encodeURIComponent(slug)}`);
  return data;
}

export async function fetchCurrencies(): Promise<Currency[]> {
  const { data } = await apiClient.get<Currency[]>("/currencies");
  return data;
}
