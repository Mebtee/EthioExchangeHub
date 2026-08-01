/**
 * Mock data for the Admin Dashboard UI.
 *
 * All mock data lives in the dedicated `src/mocks/` directory so it stays
 * isolated from production components.
 *
 * RETENTION STATUS (verified): the corresponding backend endpoints
 * (GET /api/admin/dashboard, /api/admin/manual-rates,
 * /api/admin/scraper-health, /api/admin/scrape-logs) are NOT available yet —
 * no backend is running and the workspace Express backend exposes no admin
 * routes. Per project decision these mocks are retained and marked `TODO` in
 * `src/hooks/use-admin.ts` until each endpoint ships; then set
 * `VITE_USE_MOCKS=false` to switch the hooks to the real API responses.
 */

import type {
  AdminProfile,
  AdminSettings,
  DashboardStat,
  ManualRate,
  RateTrendPoint,
  ScrapeLog,
  ScraperHealth,
} from "@/types/admin";

export const BANK_OPTIONS = [
  "Commercial Bank of Ethiopia",
  "Awash Bank",
  "Dashen Bank",
  "Bank of Abyssinia",
  "Wegagen Bank",
  "United Bank",
  "Nib International Bank",
  "Cooperative Bank of Oromia",
  "Zemen Bank",
  "Abay Bank",
] as const;

export const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "AED", "SAR", "KES", "CNY", "JPY"] as const;

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const hoursAgo = (h: number) => minutesAgo(h * 60);
const daysAgo = (d: number) => hoursAgo(d * 24);

/* ---------------------------------- Dashboard ---------------------------------- */

export const DASHBOARD_STATS: DashboardStat[] = [
  { label: "Banks Tracked", value: "18", delta: "+2 this month", direction: "up" },
  { label: "Active Rates", value: "1,240", delta: "+8.4% vs last week", direction: "up" },
  { label: "Scrapers Online", value: "6 / 7", delta: "1 degraded", direction: "neutral" },
  { label: "Scrape Success", value: "97.3%", delta: "+0.6 pts", direction: "up" },
];

export const RATE_TREND: RateTrendPoint[] = [
  { label: "Mon", cashBuying: 129.42, cashSelling: 130.61 },
  { label: "Tue", cashBuying: 129.38, cashSelling: 130.58 },
  { label: "Wed", cashBuying: 129.51, cashSelling: 130.72 },
  { label: "Thu", cashBuying: 129.47, cashSelling: 130.66 },
  { label: "Fri", cashBuying: 129.6, cashSelling: 130.81 },
  { label: "Sat", cashBuying: 129.55, cashSelling: 130.74 },
  { label: "Sun", cashBuying: 129.63, cashSelling: 130.79 },
];

/* ------------------------------ Manual Exchange Rates ----------------------------- */

export const MANUAL_RATES: ManualRate[] = [
  {
    id: 1,
    bankName: "Commercial Bank of Ethiopia",
    currency: "USD",
    cashBuying: 129.42,
    cashSelling: 130.61,
    transactionBuying: 129.85,
    transactionSelling: 130.2,
    lastUpdated: hoursAgo(2),
    source: "manual",
  },
  {
    id: 2,
    bankName: "Awash Bank",
    currency: "USD",
    cashBuying: 129.51,
    cashSelling: 130.72,
    transactionBuying: 129.9,
    transactionSelling: 130.35,
    lastUpdated: hoursAgo(3),
    source: "manual",
  },
  {
    id: 3,
    bankName: "Dashen Bank",
    currency: "EUR",
    cashBuying: 141.28,
    cashSelling: 142.6,
    transactionBuying: 141.7,
    transactionSelling: 142.15,
    lastUpdated: hoursAgo(1),
    source: "manual",
  },
  {
    id: 4,
    bankName: "Bank of Abyssinia",
    currency: "GBP",
    cashBuying: 164.9,
    cashSelling: 166.35,
    transactionBuying: 165.4,
    transactionSelling: 165.85,
    lastUpdated: hoursAgo(5),
    source: "manual",
  },
  {
    id: 5,
    bankName: "Wegagen Bank",
    currency: "AED",
    cashBuying: 35.22,
    cashSelling: 35.55,
    transactionBuying: 35.33,
    transactionSelling: 35.45,
    lastUpdated: hoursAgo(4),
    source: "manual",
  },
  {
    id: 6,
    bankName: "United Bank",
    currency: "SAR",
    cashBuying: 34.48,
    cashSelling: 34.81,
    transactionBuying: 34.6,
    transactionSelling: 34.72,
    lastUpdated: hoursAgo(6),
    source: "manual",
  },
  {
    id: 7,
    bankName: "Nib International Bank",
    currency: "USD",
    cashBuying: 129.46,
    cashSelling: 130.68,
    transactionBuying: 129.88,
    transactionSelling: 130.3,
    lastUpdated: daysAgo(1),
    source: "scraper",
  },
  {
    id: 8,
    bankName: "Cooperative Bank of Oromia",
    currency: "KES",
    cashBuying: 0.98,
    cashSelling: 1.02,
    transactionBuying: 0.99,
    transactionSelling: 1.01,
    lastUpdated: daysAgo(1),
    source: "scraper",
  },
];

/* --------------------------------- Scraper Health --------------------------------- */

export const SCRAPERS: ScraperHealth[] = [
  {
    id: 1,
    name: "CBE Scraper",
    bank: "Commercial Bank of Ethiopia",
    status: "healthy",
    successRate: 99.2,
    lastRun: minutesAgo(12),
    nextRun: minutesAgo(-48),
    records: 1240,
    avgDurationMs: 8400,
  },
  {
    id: 2,
    name: "Awash Scraper",
    bank: "Awash Bank",
    status: "healthy",
    successRate: 98.6,
    lastRun: minutesAgo(9),
    nextRun: minutesAgo(-51),
    records: 1130,
    avgDurationMs: 7200,
  },
  {
    id: 3,
    name: "Dashen Scraper",
    bank: "Dashen Bank",
    status: "degraded",
    successRate: 84.1,
    lastRun: hoursAgo(2),
    nextRun: minutesAgo(-22),
    records: 980,
    avgDurationMs: 11500,
  },
  {
    id: 4,
    name: "BoA Scraper",
    bank: "Bank of Abyssinia",
    status: "healthy",
    successRate: 97.8,
    lastRun: minutesAgo(7),
    nextRun: minutesAgo(-53),
    records: 1050,
    avgDurationMs: 6900,
  },
  {
    id: 5,
    name: "Wegagen Scraper",
    bank: "Wegagen Bank",
    status: "healthy",
    successRate: 96.4,
    lastRun: minutesAgo(15),
    nextRun: minutesAgo(-45),
    records: 890,
    avgDurationMs: 8100,
  },
  {
    id: 6,
    name: "United Scraper",
    bank: "United Bank",
    status: "healthy",
    successRate: 98.9,
    lastRun: minutesAgo(11),
    nextRun: minutesAgo(-49),
    records: 760,
    avgDurationMs: 6500,
  },
  {
    id: 7,
    name: "NIB Scraper",
    bank: "Nib International Bank",
    status: "offline",
    successRate: 0,
    lastRun: hoursAgo(26),
    nextRun: minutesAgo(-12),
    records: 0,
    avgDurationMs: 0,
  },
];

/* ---------------------------------- Scrape Logs ---------------------------------- */

export const SCRAPE_LOGS: ScrapeLog[] = [
  {
    id: 1,
    timestamp: minutesAgo(3),
    scraper: "CBE Scraper",
    bank: "Commercial Bank of Ethiopia",
    status: "success",
    records: 412,
    durationMs: 8100,
    message: "Scrape completed successfully.",
  },
  {
    id: 2,
    timestamp: minutesAgo(7),
    scraper: "BoA Scraper",
    bank: "Bank of Abyssinia",
    status: "success",
    records: 356,
    durationMs: 6900,
    message: "Scrape completed successfully.",
  },
  {
    id: 3,
    timestamp: minutesAgo(11),
    scraper: "United Scraper",
    bank: "United Bank",
    status: "warning",
    records: 240,
    durationMs: 11200,
    message: "Some rate rows skipped — schema mismatch on 3 pages.",
  },
  {
    id: 4,
    timestamp: minutesAgo(16),
    scraper: "Dashen Scraper",
    bank: "Dashen Bank",
    status: "error",
    records: 0,
    durationMs: 30500,
    message: "Timed out while fetching currency table.",
  },
  {
    id: 5,
    timestamp: minutesAgo(21),
    scraper: "Wegagen Scraper",
    bank: "Wegagen Bank",
    status: "success",
    records: 287,
    durationMs: 7800,
    message: "Scrape completed successfully.",
  },
  {
    id: 6,
    timestamp: minutesAgo(29),
    scraper: "Awash Scraper",
    bank: "Awash Bank",
    status: "success",
    records: 391,
    durationMs: 7200,
    message: "Scrape completed successfully.",
  },
  {
    id: 7,
    timestamp: minutesAgo(42),
    scraper: "CBE Scraper",
    bank: "Commercial Bank of Ethiopia",
    status: "warning",
    records: 402,
    durationMs: 9400,
    message: "Retried 2 requests after HTTP 429 responses.",
  },
  {
    id: 8,
    timestamp: hoursAgo(1),
    scraper: "NIB Scraper",
    bank: "Nib International Bank",
    status: "error",
    records: 0,
    durationMs: 62000,
    message: "Connection refused — site unreachable.",
  },
  {
    id: 9,
    timestamp: hoursAgo(2),
    scraper: "BoA Scraper",
    bank: "Bank of Abyssinia",
    status: "success",
    records: 344,
    durationMs: 6800,
    message: "Scrape completed successfully.",
  },
  {
    id: 10,
    timestamp: hoursAgo(3),
    scraper: "Dashen Scraper",
    bank: "Dashen Bank",
    status: "success",
    records: 318,
    durationMs: 8300,
    message: "Scrape completed successfully.",
  },
  {
    id: 11,
    timestamp: hoursAgo(4),
    scraper: "United Scraper",
    bank: "United Bank",
    status: "warning",
    records: 231,
    durationMs: 10400,
    message: "Parsed 4 stale rows from cached page.",
  },
  {
    id: 12,
    timestamp: hoursAgo(6),
    scraper: "CBE Scraper",
    bank: "Commercial Bank of Ethiopia",
    status: "success",
    records: 408,
    durationMs: 7900,
    message: "Scrape completed successfully.",
  },
  {
    id: 13,
    timestamp: hoursAgo(8),
    scraper: "Awash Scraper",
    bank: "Awash Bank",
    status: "success",
    records: 385,
    durationMs: 7100,
    message: "Scrape completed successfully.",
  },
  {
    id: 14,
    timestamp: hoursAgo(12),
    scraper: "NIB Scraper",
    bank: "Nib International Bank",
    status: "error",
    records: 0,
    durationMs: 58000,
    message: "SSL certificate verification failed.",
  },
];

/* ---------------------------------- Profile & Settings ---------------------------------- */

export const ADMIN_PROFILE: AdminProfile = {
  name: "Ethio Exchange Admin",
  email: "admin@ethioexchange.dev",
  role: "Super Admin",
  initials: "EE",
  memberSince: daysAgo(320),
  lastLogin: hoursAgo(2),
};

export const ADMIN_SETTINGS: AdminSettings = {
  siteName: "Ethio Exchange Hub",
  defaultCurrency: "USD",
  refreshInterval: "15",
  timezone: "Africa/Addis_Ababa",
  retentionDays: "90",
  emailAlerts: true,
  failureAlerts: true,
  dailyDigest: false,
  weeklyReport: true,
};
