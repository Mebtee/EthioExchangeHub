import { apiRequest, ApiError } from "./client";
import type { ApiResponse, ExchangeRate } from "@/types/exchange-rate";

export async function fetchExchangeRates(currency?: string): Promise<ExchangeRate[]> {
  const response = await apiRequest<ApiResponse<ExchangeRate[]>>("/exchange-rates", {
    params: { currency },
  });

  if (!response?.success) {
    throw new ApiError(response?.message ?? "Failed to load exchange rates.");
  }

  return Array.isArray(response.data) ? response.data : [];
}
