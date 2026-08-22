import type { LogStatus, ScraperStatus } from "@/types/admin";

/** Badge tone variants used by StatusBadge and derived from domain statuses. */
export type StatusTone = "success" | "warning" | "danger" | "neutral";

/** Maps a canonical scrape-log status to its badge tone (D3). */
export function logStatusTone(status: LogStatus): StatusTone {
  return status === "success" ? "success" : "danger";
}

/** Maps a canonical scraper-health bucket to its badge tone (D3). */
export function scraperStatusTone(status: ScraperStatus): StatusTone {
  switch (status) {
    case "healthy":
      return "success";
    case "degraded":
      return "warning";
    case "failed":
      return "danger";
    case "unknown":
      return "neutral";
  }
}

/** Maps a customer subscription status to its badge tone (Phase 6). */
export function subscriptionStatusTone(status: string): StatusTone {
  switch (status) {
    case "active":
      return "success";
    case "pending":
      return "warning";
    case "suspended":
    case "expired":
    case "cancelled":
      return "danger";
    default:
      return "neutral";
  }
}

/** Maps a manual bank-transfer payment status to its badge tone (Phase 6). */
export function paymentStatusTone(status: string): StatusTone {
  switch (status) {
    case "approved":
      return "success";
    case "pending":
    case "under_review":
      return "warning";
    case "rejected":
    case "cancelled":
      return "danger";
    default:
      return "neutral";
  }
}
