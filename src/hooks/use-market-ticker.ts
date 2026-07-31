import { useQuery } from "@tanstack/react-query";

import { fetchMarketTicker } from "@/lib/api/market-ticker";
import { marketTickerKeys } from "@/lib/query-keys";
import type { MarketTickerItem } from "@/types/market";

export function useMarketTicker() {
  return useQuery<MarketTickerItem[]>({
    queryKey: marketTickerKeys.lists(),
    queryFn: fetchMarketTicker,
  });
}
