import { QueryClient } from "@tanstack/react-query";

/**
 * Global TanStack Query configuration.
 * Tune cache defaults here once for the whole app.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
