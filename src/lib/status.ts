import type { LogStatus, ScraperStatus } from "@/types/admin";

/** Badge tone variants used by StatusBadge and derived from domain statuses. */
export type StatusTone = "success" | "warning" | "danger" | "neutral";

/** Maps a scrape-log status to its badge tone. */
export function logStatusTone(status: LogStatus): StatusTone {
  if (status === "success") return "success";
  if (status === "warning") return "warning";
  return "danger";
}

/** Maps a scraper-health status to its badge tone. */
export function scraperStatusTone(status: ScraperStatus): StatusTone {
  if (status === "healthy") return "success";
  if (status === "degraded") return "warning";
  return "danger";
}
