import { apiClient } from "./client";
import type {
  AdminProfile,
  AdminSettings,
  DashboardStat,
  ManualRate,
  RateTrendPoint,
  ScrapeLog,
  ScraperHealth,
} from "@/types/admin";

/**
 * Admin API service.
 *
 * ENDPOINT AVAILABILITY (verified): the Express backend is not running and the
 * only Express backend in this workspace exposes no admin routes, so all of the
 * endpoints below are currently UNAVAILABLE. Per project decision, the admin
 * hooks keep serving mock data from `src/mocks/` and are marked with `TODO`
 * until each endpoint ships.
 *
 * These functions are NOT called while `VITE_USE_MOCKS=true` (the default).
 * They are the ready-to-use wiring: flip `VITE_USE_MOCKS=false` once the
 * backend exposes these routes and the hooks in `src/hooks/use-admin.ts`
 * switch over automatically — no component changes required.
 *
 * ENVELOPE CONTRACT: `src/lib/api/client.ts` only unwraps a
 * `{ success, message, data }` envelope. The workspace Express backend
 * (`exchange plat`) currently responds with `{ status, data: {...} }` — the
 * shipped admin endpoints must return the `{ success, message, data }` shape
 * (or the unwrap logic in `client.ts` must be extended) or these functions
 * will receive the wrong shape.
 */

// TODO: Replace mock data (DASHBOARD_STATS) with this endpoint once
// GET /api/admin/dashboard is available.
export async function fetchAdminDashboard(): Promise<DashboardStat[]> {
  const { data } = await apiClient.get<DashboardStat[]>("/admin/dashboard");
  return data;
}

// TODO: Replace mock data (RATE_TREND) with this endpoint once a trend route
// exists (not part of the agreed endpoint list yet).
export async function fetchRateTrend(): Promise<RateTrendPoint[]> {
  const { data } = await apiClient.get<RateTrendPoint[]>("/admin/dashboard/rate-trend");
  return data;
}

// TODO: Replace mock data (MANUAL_RATES) with this endpoint once
// GET /api/admin/manual-rates is available.
export async function fetchManualRates(): Promise<ManualRate[]> {
  const { data } = await apiClient.get<ManualRate[]>("/admin/manual-rates");
  return data;
}

// TODO: Replace mock data (SCRAPE_LOGS) with this endpoint once
// GET /api/admin/scrape-logs is available.
export async function fetchScrapeLogs(): Promise<ScrapeLog[]> {
  const { data } = await apiClient.get<ScrapeLog[]>("/admin/scrape-logs");
  return data;
}

// TODO: Replace mock data (SCRAPERS) with this endpoint once
// GET /api/admin/scraper-health is available.
export async function fetchScraperHealth(): Promise<ScraperHealth[]> {
  const { data } = await apiClient.get<ScraperHealth[]>("/admin/scraper-health");
  return data;
}

// TODO: Replace mock data (ADMIN_PROFILE) with this endpoint once a profile
// route exists (not part of the agreed endpoint list yet).
export async function fetchAdminProfile(): Promise<AdminProfile> {
  const { data } = await apiClient.get<AdminProfile>("/admin/profile");
  return data;
}

// TODO: Replace mock data (ADMIN_SETTINGS) with this endpoint once a settings
// route exists (not part of the agreed endpoint list yet).
export async function fetchAdminSettings(): Promise<AdminSettings> {
  const { data } = await apiClient.get<AdminSettings>("/admin/settings");
  return data;
}
