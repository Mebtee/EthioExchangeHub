import { useQuery, type QueryKey } from "@tanstack/react-query";

import { config } from "@/lib/config";

const MOCK_LATENCY_MS = 350;

interface UseMockableQueryOptions<T> {
  queryKey: QueryKey;
  /** Real API request — used only when VITE_USE_MOCKS is false. */
  queryFn: () => Promise<T>;
  /** Static data served while mocks are enabled. */
  mockData: T;
}

/**
 * TanStack Query hook that serves mock data today and the real API later.
 *
 * While `config.useMocks` is true the query resolves `mockData` after a short
 * simulated latency so loading states behave like a real fetch. Flip
 * `VITE_USE_MOCKS=false` once the backend endpoints exist and every hook built
 * on this one transparently switches to `queryFn` — no component changes
 * required.
 */
export function useMockableQuery<T>({ queryKey, queryFn, mockData }: UseMockableQueryOptions<T>) {
  return useQuery<T>({
    queryKey,
    queryFn: config.useMocks
      ? () =>
          new Promise<T>((resolve) => {
            window.setTimeout(() => resolve(mockData), MOCK_LATENCY_MS);
          })
      : queryFn,
    staleTime: config.useMocks ? Infinity : 60_000,
    refetchOnWindowFocus: !config.useMocks,
    retry: config.useMocks ? false : 1,
  });
}
