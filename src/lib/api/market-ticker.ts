import { marketTicker } from "@/lib/demo-data";
import type { MarketTickerItem } from "@/types/market";

// TODO(backend): Replace this mock with a real API call (e.g. GET /market-ticker).

export async function fetchMarketTicker(): Promise<MarketTickerItem[]> {
  return marketTicker;
}
