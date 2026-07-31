import { useEffect, useRef, useState } from "react";

/**
 * Simulates a network fetch for UI development before the backend is wired up.
 * Accepts a getter so callers can build derived arrays without effect re-runs.
 */
export function useMockFetch<T>(getData: () => T, delayMs = 650) {
  const [state, setState] = useState<{ data: T | undefined; isLoading: boolean }>({
    data: undefined,
    isLoading: true,
  });
  const getDataRef = useRef(getData);
  getDataRef.current = getData;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setState({ data: getDataRef.current(), isLoading: false });
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  return state;
}
