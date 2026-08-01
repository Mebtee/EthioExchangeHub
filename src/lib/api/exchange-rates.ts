import { apiClient } from "./client";
import type { ExchangeRate } from "@/types/exchange-rate";

// NOTE: client.ts only unwraps a `{ success, message, data }` envelope. The
// workspace Express backend responds with `{ status, data: {...} }`, so once
// it runs this call must either be adapted to that shape or client.ts's
// envelope unwrap must be extended — otherwise `data` will be the wrong type.
export async function fetchExchangeRates(currency?: string): Promise<ExchangeRate[]> {
  const { data } = await apiClient.get<ExchangeRate[]>("/exchange-rates", {
    params: { currency: currency || undefined },
  });
  return data;
}
