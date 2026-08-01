import { QueryClient } from "@tanstack/react-query";

/**
 * Global TanStack Query configuration — tuned once for the whole app.
 *
 * Caching: 60s staleTime means repeated visits reuse fresh data without
 * hammering the API; gcTime keeps resolved data around for back/forward nav.
 *
 * Retry: exponential backoff (1s → 2s → 4s…) with a cap, instead of retrying
 * instantly. Network-level retries are handled by the axios client, so queries
 * only retry a couple of times.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10_000),
    },
  },
});
