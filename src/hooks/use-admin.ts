import {
  fetchAdminDashboard,
  fetchAdminProfile,
  fetchAdminSettings,
  fetchManualRates,
  fetchRateTrend,
  fetchScrapeLogs,
  fetchScraperHealth,
} from "@/lib/api/admin";
import { adminKeys } from "@/lib/query-keys";
import {
  ADMIN_PROFILE,
  ADMIN_SETTINGS,
  DASHBOARD_STATS,
  MANUAL_RATES,
  RATE_TREND,
  SCRAPE_LOGS,
  SCRAPERS,
} from "@/mocks/admin";
import { useMockableQuery } from "./use-mockable-query";

/**
 * Admin data hooks.
 *
 * ENDPOINT AVAILABILITY (verified): none of the admin endpoints exist yet
 * (no running backend; the workspace Express backend has no admin routes), so
 * every hook serves mock data from `src/mocks/` while `VITE_USE_MOCKS=true`
 * (the default) and is marked with `TODO`. Once the backend ships the routes
 * below, set `VITE_USE_MOCKS=false` and each hook transparently switches to
 * the matching function in `src/lib/api/admin.ts` — no component changes.
 */

// TODO: GET /api/admin/dashboard is unavailable — mock retained.
export function useDashboardStats() {
  return useMockableQuery({
    queryKey: adminKeys.dashboard(),
    mockData: DASHBOARD_STATS,
    queryFn: fetchAdminDashboard,
  });
}

// TODO: no trend endpoint agreed yet — mock retained.
export function useRateTrend() {
  return useMockableQuery({
    queryKey: adminKeys.rateTrend(),
    mockData: RATE_TREND,
    queryFn: fetchRateTrend,
  });
}

// TODO: GET /api/admin/manual-rates is unavailable — mock retained.
export function useManualRates() {
  return useMockableQuery({
    queryKey: adminKeys.manualRates(),
    mockData: MANUAL_RATES,
    queryFn: fetchManualRates,
  });
}

// TODO: GET /api/admin/scrape-logs is unavailable — mock retained.
export function useScrapeLogs() {
  return useMockableQuery({
    queryKey: adminKeys.scrapeLogs(),
    mockData: SCRAPE_LOGS,
    queryFn: fetchScrapeLogs,
  });
}

// TODO: GET /api/admin/scraper-health is unavailable — mock retained.
export function useScraperHealth() {
  return useMockableQuery({
    queryKey: adminKeys.scraperHealth(),
    mockData: SCRAPERS,
    queryFn: fetchScraperHealth,
  });
}

// TODO: no profile endpoint agreed yet — mock retained.
export function useAdminProfile() {
  return useMockableQuery({
    queryKey: adminKeys.profile(),
    mockData: ADMIN_PROFILE,
    queryFn: fetchAdminProfile,
  });
}

// TODO: no settings endpoint agreed yet — mock retained.
export function useAdminSettings() {
  return useMockableQuery({
    queryKey: adminKeys.settings(),
    mockData: ADMIN_SETTINGS,
    queryFn: fetchAdminSettings,
  });
}
