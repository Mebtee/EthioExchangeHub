import { lazy } from "react";
import type { ComponentType, LazyExoticComponent } from "react";

/**
 * Route-level lazy loading that survives stale-bundle deploy races.
 *
 * When a deployment changes content hashes, a browser still running the
 * previous shell can request a route chunk that no longer exists. Because the
 * SPA rewrite answers every miss with index.html (HTTP 200), the "chunk"
 * arrives as HTML and throws a SyntaxError when parsed — crashing the route
 * into the error boundary even though the app itself is healthy.
 *
 * The fix is the standard one-shot recovery: remember the failure per chunk
 * in sessionStorage and hard-reload once so the browser fetches the fresh
 * index.html together with its matching asset set. A second failure (real
 * bug, offline, ...) rethrows instead of looping.
 */

const RETRY_FLAG_PREFIX = "chunk-retry:";

export function lazyRoute<P>(
  key: string,
  load: () => Promise<{ default: ComponentType<P> }>,
): LazyExoticComponent<ComponentType<P>> {
  return lazy(async () => {
    const flagKey = `${RETRY_FLAG_PREFIX}${key}`;
    try {
      const mod = await load();
      // Recovered — re-arm the single retry for future deployments.
      sessionStorage.removeItem(flagKey);
      return mod;
    } catch (error) {
      if (!sessionStorage.getItem(flagKey)) {
        sessionStorage.setItem(flagKey, "1");
        window.location.assign(window.location.href);
      }
      throw error;
    }
  });
}
