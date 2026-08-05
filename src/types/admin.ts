/**
 * Admin domain types.
 *
 * Every type below mirrors the real backend contract served by
 * `src/lib/api/admin.ts` — no mock shapes remain and every endpoint exists on
 * the backend. Failures surface as loading/empty/API-error states; nothing
 * is ever invented client-side.
 */

export interface DashboardStat {
  label: string;
  value: string;
  delta: string;
  direction: "up" | "down" | "neutral";
}

export interface RateTrendPoint {
  label: string;
  cashBuying: number;
  cashSelling: number;
}

/** Manual-rate row as served by `GET /api/v1/manual-rates`. */
export interface ManualRate {
  id: string;
  bankCode: string;
  bankName: string;
  currency: string;
  buyingRate: number;
  sellingRate: number;
  /** ISO date (YYYY-MM-DD). */
  rateDate: string;
  note: string | null;
  createdAt: string | null;
}

/** Payload for `POST /api/v1/manual-rates`. */
export interface ManualRatePayload {
  bank_code: string;
  currency_code: string;
  buying_rate: number;
  selling_rate: number;
  rate_date: string;
  note?: string | null;
}

/** Payload for `PUT /api/v1/manual-rates/:id` (any subset, at least one field). */
export type ManualRateUpdate = Partial<ManualRatePayload>;

/** Aggregate scraper-health summary as served by `GET /api/v1/scraper-health`. */
export interface ScraperHealthSummary {
  total: number;
  healthy: number;
  degraded: number;
  failed: number;
  unknown: number;
  averageResponseTimeMs: number | null;
  averageConsecutiveFailures: number | null;
  /** Scrapers with a missing or outdated last_rate_date (D2). */
  staleCount: number;
}

/**
 * Canonical scraper-health bucket (D3) — mirrors the backend's
 * `categorizeScraperStatus`. The raw row status is free text; these four
 * buckets are the single vocabulary the UI filters and colors by.
 */
export type ScraperStatus = "healthy" | "degraded" | "failed" | "unknown";

/** One per-bank scraper-health row as served by `GET /api/v1/scraper-health/list`. */
export interface ScraperHealthRow {
  bankCode: string;
  bankName: string;
  status: ScraperStatus;
  consecutiveFailures: number | null;
  lastSuccess: string | null;
  lastFailure: string | null;
  /** ISO date (YYYY-MM-DD) of the newest rate the scraper captured. */
  lastRateDate: string | null;
  responseTimeMs: number | null;
  updatedAt: string | null;
}

/**
 * Canonical scrape-log status (D3) — mirrors the backend's single source of
 * truth (`success | failed`). Anything that is not `success` is treated as
 * `failed`; there is deliberately no third bucket so filters and validators
 * can never drift apart.
 */
export type LogStatus = "success" | "failed";

/** Scrape-log row as served by `GET /api/v1/scrape-logs`. */
export interface ScrapeLog {
  id: string;
  runId: string;
  bankCode: string;
  bankName: string;
  status: LogStatus;
  scenario: string;
  records: number;
  durationMs: number;
  message: string | null;
  ranAt: string | null;
}

export interface AdminProfile {
  name: string;
  email: string;
  role: string;
  initials: string;
  memberSince: string;
  lastLogin: string;
}

/** Payload for `PUT /api/v1/admin/profile` — any subset, at least one field. */
export type AdminProfileUpdate = Partial<Pick<AdminProfile, "name" | "email" | "role">>;

export interface AdminSettings {
  siteName: string;
  defaultCurrency: string;
  refreshInterval: string;
  timezone: string;
  retentionDays: string;
  emailAlerts: boolean;
  failureAlerts: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
}

/** Payload for `PUT /api/v1/admin/settings` — any subset, at least one field. */
export type AdminSettingsUpdate = Partial<AdminSettings>;
