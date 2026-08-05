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
