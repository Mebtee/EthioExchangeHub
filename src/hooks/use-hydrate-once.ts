import { useEffect, useRef } from "react";

/**
 * Runs `apply` exactly once with the first non-undefined `data` value.
 *
 * Used to seed local form state from an async query without clobbering
 * subsequent user edits on later refetches — the pattern previously
 * duplicated across the admin form pages.
 */
export function useHydrateOnce<T>(data: T | undefined, apply: (data: T) => void) {
  const hydrated = useRef(false);
  // Keep the latest callback without making it an effect dependency, so the
  // effect only re-runs when the data payload changes.
  const applyRef = useRef(apply);
  applyRef.current = apply;

  useEffect(() => {
    if (data !== undefined && !hydrated.current) {
      hydrated.current = true;
      applyRef.current(data);
    }
  }, [data]);
}
