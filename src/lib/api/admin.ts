import { apiClient } from "./client";
import { fetchBanks } from "./banks";
import {
  mapBankRow,
  mapExchangeRateRow,
  mapManualRateRow,
  mapScrapeLogRow,
  mapScraperHealthRow,
  type BackendBankRow,
  type BackendExchangeRateRow,
  type BackendManualRateRow,
  type BackendScrapeLogRow,
  type BackendScraperHealthRow,
  type BackendScraperHealthSummary,
} from "./adapters";
import type {
  AdminBankAccountPayload,
  AdminBankAccountUpdate,
  AdminBankAccountView,
  AdminPaymentView,
  AdminProfile,
  AdminProfileUpdate,
  AdminReviewAction,
  AdminSettings,
  AdminSettingsUpdate,
  DashboardStat,
  ManualRate,
  ManualRatePayload,
  ManualRateUpdate,
  RateTrendPoint,
  ScrapeLog,
  ScraperHealthRow,
  ScraperHealthSummary,
} from "@/types/admin";

/** Payment status filter accepted by `GET /admin/payments`. */
export type AdminPaymentStatusFilter =
  "pending" | "under_review" | "approved" | "rejected" | "cancelled";

/**
 * Admin API service.
 *
 * Every function talks to the real backend and is mapped through the row
 * adapters in `./adapters`. No data is ever invented client-side — failures
 * surface as proper API errors and the pages render their error states.
 */

/** Dashboard payload: the stat cards plus the recent-activity feed. */
export interface AdminDashboard {
  stats: DashboardStat[];
  recentLogs: ScrapeLog[];
}

/**
 * Dashboard data derived from the live endpoints (banks, rates, scraper
 * health, recent scrape logs). `/banks` is fetched exactly ONCE and shared by
 * every name resolution; logs are limited to the 5 most recent runs on the
 * server (no full-table download + client-side slice). The same query powers
 * both the stat cards and the "Recent activity" feed, so the dashboard issues
 * no duplicate requests.
 */
export async function fetchAdminDashboard(): Promise<AdminDashboard> {
  const [{ data: bankRows }, { data: rateRows }, health, { data: logRows }] = await Promise.all([
    apiClient.get<BackendBankRow[]>("/banks"),
    apiClient.get<BackendExchangeRateRow[]>("/rates/latest"),
    fetchScraperHealth(),
    apiClient.get<BackendScrapeLogRow[]>("/scrape-logs", { params: { limit: 5 } }),
  ]);

  const bankNameByCode = new Map(bankRows.map((bank) => [bank.bank_code, bank.bank_name]));
  const banks = bankRows.map(mapBankRow);
  const rates = rateRows.map((rate) =>
    mapExchangeRateRow(rate, bankNameByCode.get(rate.bank_code)),
  );
  const logs = logRows.map((log) => mapScrapeLogRow(log, bankNameByCode.get(log.bank_code)));

  const completedRuns = logs.length;
  const successfulRuns = logs.filter((log) => log.status === "success").length;
  const successRate =
    completedRuns > 0 ? Math.round((successfulRuns / completedRuns) * 1000) / 10 : 0;

  return {
    stats: [
      {
        label: "Banks Tracked",
        value: String(banks.length),
        delta: "from live bank directory",
        direction: "neutral",
      },
      {
        label: "Active Rates",
        value: rates.length.toLocaleString(),
        delta: "latest rate snapshot",
        direction: "neutral",
      },
      {
        label: "Scrapers Online",
        value: `${health.healthy} / ${health.total}`,
        delta: `${health.degraded} degraded`,
        direction: "neutral",
      },
      {
        label: "Scrape Success",
        value: `${successRate}%`,
        delta: `${completedRuns} recent runs`,
        direction: "neutral",
      },
    ],
    recentLogs: logs,
  };
}

/**
 * Cash buying/selling trend for USD over the last 7 days (matches the
 * dashboard card's label; the endpoint aggregates real exchange_rates data).
 */
export async function fetchRateTrend(): Promise<RateTrendPoint[]> {
  const { data } = await apiClient.get<RateTrendPoint[]>("/admin/dashboard/rate-trend", {
    params: { currency: "USD", days: 7 },
  });
  return data;
}

export async function fetchManualRates(): Promise<ManualRate[]> {
  const [{ data: rates }, banks] = await Promise.all([
    apiClient.get<BackendManualRateRow[]>("/manual-rates"),
    fetchBanks(),
  ]);
  const bankNameByCode = new Map(banks.map((bank) => [bank.slug, bank.name]));
  return rates.map((rate) => mapManualRateRow(rate, bankNameByCode.get(rate.bank_code)));
}

export async function createManualRate(payload: ManualRatePayload): Promise<ManualRate> {
  const { data } = await apiClient.post<BackendManualRateRow>("/manual-rates", payload);
  return mapManualRateRow(data);
}

export async function updateManualRate(id: string, payload: ManualRateUpdate): Promise<ManualRate> {
  const { data } = await apiClient.put<BackendManualRateRow>(`/manual-rates/${id}`, payload);
  return mapManualRateRow(data);
}

export async function deleteManualRate(id: string): Promise<void> {
  await apiClient.delete(`/manual-rates/${id}`);
}

export async function fetchScrapeLogs(limit?: number): Promise<ScrapeLog[]> {
  const [{ data: logs }, banks] = await Promise.all([
    apiClient.get<BackendScrapeLogRow[]>(
      "/scrape-logs",
      limit !== undefined ? { params: { limit } } : undefined,
    ),
    fetchBanks(),
  ]);
  const bankNameByCode = new Map(banks.map((bank) => [bank.slug, bank.name]));
  return logs.map((log) => mapScrapeLogRow(log, bankNameByCode.get(log.bank_code)));
}

export async function fetchScraperHealth(): Promise<ScraperHealthSummary> {
  const { data } = await apiClient.get<BackendScraperHealthSummary>("/scraper-health");
  return data;
}

/** Per-bank scraper-health rows (admin list), names resolved from /banks. */
export async function fetchScraperHealthList(): Promise<ScraperHealthRow[]> {
  const [{ data: rows }, banks] = await Promise.all([
    apiClient.get<BackendScraperHealthRow[]>("/scraper-health/list"),
    fetchBanks(),
  ]);
  const bankNameByCode = new Map(banks.map((bank) => [bank.slug, bank.name]));
  return rows.map((row) => mapScraperHealthRow(row, bankNameByCode.get(row.bank_code)));
}

/** The configured administrator profile. */
export async function fetchAdminProfile(): Promise<AdminProfile> {
  const { data } = await apiClient.get<AdminProfile>("/admin/profile");
  return data;
}

/** Persists the provided profile fields and returns the stored profile. */
export async function updateAdminProfile(payload: AdminProfileUpdate): Promise<AdminProfile> {
  const { data } = await apiClient.put<AdminProfile>("/admin/profile", payload);
  return data;
}

/** The persisted platform settings (merged with configured defaults). */
export async function fetchAdminSettings(): Promise<AdminSettings> {
  const { data } = await apiClient.get<AdminSettings>("/admin/settings");
  return data;
}

/** Persists the provided settings fields and returns the stored settings. */
export async function updateAdminSettings(payload: AdminSettingsUpdate): Promise<AdminSettings> {
  const { data } = await apiClient.put<AdminSettings>("/admin/settings", payload);
  return data;
}

// ---- Payment review + bank-account management (manual bank transfer) ----

/** Lists payments, newest first, optionally filtered by review status. */
export async function fetchAdminPayments(
  status?: AdminPaymentStatusFilter,
): Promise<AdminPaymentView[]> {
  const { data } = await apiClient.get<AdminPaymentView[]>("/admin/payments", {
    params: status ? { status } : undefined,
  });
  return data;
}

/**
 * Applies a review transition. Approving activates the payment's
 * subscription server-side; re-reviewing a terminal payment answers 409.
 */
export async function reviewAdminPayment(
  paymentId: string,
  action: AdminReviewAction,
  rejectionReason?: string,
): Promise<AdminPaymentView> {
  const { data } = await apiClient.post<AdminPaymentView>(
    `/admin/payments/${paymentId}/review`,
    rejectionReason !== undefined && action === "reject"
      ? { action, rejection_reason: rejectionReason }
      : { action },
  );
  return data;
}

/** Opens a short-lived signed URL for the payment's uploaded receipt. */
export async function fetchAdminReceiptUrl(
  paymentId: string,
): Promise<{ url: string; expiresInSeconds: number }> {
  const { data } = await apiClient.get<{ url: string; expiresInSeconds: number }>(
    `/admin/payments/${paymentId}/receipt`,
  );
  return data;
}

/** All configured bank accounts, including inactive ones. */
export async function fetchAdminBankAccounts(): Promise<AdminBankAccountView[]> {
  const { data } = await apiClient.get<AdminBankAccountView[]>("/admin/payment-methods");
  return data;
}

/** Creates a bank account (active by default). */
export async function createAdminBankAccount(
  payload: AdminBankAccountPayload,
): Promise<AdminBankAccountView> {
  const { data } = await apiClient.post<AdminBankAccountView>("/admin/payment-methods", payload);
  return data;
}

/** Updates bank-account fields and/or the active flag. */
export async function updateAdminBankAccount(
  id: string,
  payload: AdminBankAccountUpdate,
): Promise<AdminBankAccountView> {
  const { data } = await apiClient.patch<AdminBankAccountView>(
    `/admin/payment-methods/${id}`,
    payload,
  );
  return data;
}
