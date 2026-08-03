import { apiClient } from "./client";
import { mapExchangeRateRow, type BackendBankRow, type BackendExchangeRateRow } from "./adapters";
import type { ExchangeRate } from "@/types/exchange-rate";

export async function fetchExchangeRates(currency?: string): Promise<ExchangeRate[]> {
  const [{ data: rates }, { data: banks }] = await Promise.all([
    apiClient.get<BackendExchangeRateRow[]>("/rates/latest"),
    apiClient.get<BackendBankRow[]>("/banks"),
  ]);

  const bankNameByCode = new Map(banks.map((bank) => [bank.bank_code, bank.bank_name]));
  const mapped = rates.map((rate) => mapExchangeRateRow(rate, bankNameByCode.get(rate.bank_code)));

  if (!currency) return mapped;
  return mapped.filter((rate) => rate.currency === currency);
}
