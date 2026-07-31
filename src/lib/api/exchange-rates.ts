import { apiClient } from "./client";
import type { ExchangeRate } from "@/types/exchange-rate";

export async function fetchExchangeRates(currency?: string): Promise<ExchangeRate[]> {
  const { data } = await apiClient.get<ExchangeRate[]>("/exchange-rates", {
    params: { currency: currency || undefined },
  });
  return data;
}
