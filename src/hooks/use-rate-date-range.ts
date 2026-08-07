import { useQuery } from "@tanstack/react-query";

import { fetchRateDateRange } from "@/lib/api/exchange-rates";
import { exchangeRateKeys } from "@/lib/query-keys";
import type { RateDateRange } from "@/types/exchange-rate";

/** The oldest and newest rate_date across all published rates (bounds a date picker). */
export function useRateDateRange() {
  return useQuery<RateDateRange>({
    queryKey: exchangeRateKeys.dateRange(),
    queryFn: fetchRateDateRange,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
