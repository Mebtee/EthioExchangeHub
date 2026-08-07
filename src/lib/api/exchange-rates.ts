import { apiClient } from "./client";
import { mapExchangeRateRow, type BackendBankRow, type BackendExchangeRateRow } from "./adapters";
import type { ExchangeRate, RateDateRange } from "@/types/exchange-rate";

export async function fetchExchangeRates(
  currency?: string,
  asOfDate?: string,
): Promise<ExchangeRate[]> {
  const [{ data: rates }, { data: banks }] = await Promise.all([
    apiClient.get<BackendExchangeRateRow[]>("/rates/latest", {
      params: asOfDate ? { to: asOfDate } : undefined,
    }),
    apiClient.get<BackendBankRow[]>("/banks"),
  ]);

  const bankNameByCode = new Map(banks.map((bank) => [bank.bank_code, bank.bank_name]));
  const mapped = rates.map((rate) => mapExchangeRateRow(rate, bankNameByCode.get(rate.bank_code)));

  const exactDay = asOfDate ? mapped.filter((rate) => rate.rateDate === asOfDate) : mapped;

  if (!currency) return exactDay;
  return exactDay.filter((rate) => rate.currency === currency);
}

/** The oldest and newest rate_date across all published rates (bounds a date picker). */
export async function fetchRateDateRange(): Promise<RateDateRange> {
  const { data } = await apiClient.get<RateDateRange>("/rates/date-range");
  return data;
}
