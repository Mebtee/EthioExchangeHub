/**
 * Admin domain types.
 *
 * These types describe the admin dashboard UI's data contract. While the
 * backend endpoints are under development, the mock modules in `src/mocks/`
 * produce these shapes; once the API ships, `src/lib/api/admin.ts` will return
 * the same shapes and the hooks in `src/hooks/use-admin.ts` switch over
 * automatically.
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

export type RateSource = "manual" | "scraper";

export interface ManualRate {
  id: number;
  bankName: string;
  currency: string;
  cashBuying: number;
  cashSelling: number;
  transactionBuying: number;
  transactionSelling: number;
  lastUpdated: string;
  source: RateSource;
}

export type ScraperStatus = "healthy" | "degraded" | "offline";

export interface ScraperHealth {
  id: number;
  name: string;
  bank: string;
  status: ScraperStatus;
  successRate: number;
  lastRun: string;
  nextRun: string;
  records: number;
  avgDurationMs: number;
}

export type LogStatus = "success" | "warning" | "error";

export interface ScrapeLog {
  id: number;
  timestamp: string;
  scraper: string;
  bank: string;
  status: LogStatus;
  records: number;
  durationMs: number;
  message: string;
}

export interface AdminProfile {
  name: string;
  email: string;
  role: string;
  initials: string;
  memberSince: string;
  lastLogin: string;
}

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
