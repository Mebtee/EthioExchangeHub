import { apiClient } from "./client";
import type { MarketTickerItem } from "@/types/market";

export async function fetchMarketTicker(): Promise<MarketTickerItem[]> {
  const { data } = await apiClient.get<MarketTickerItem[]>("/market-ticker");
  return data;
}
