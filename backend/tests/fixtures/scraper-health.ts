import type { ScraperHealthRow } from "@/types/scraper-health";

/** Typed scraper-health fixtures covering every status bucket. */
export const scraperHealth: ScraperHealthRow[] = [
  {
    bank_code: "ABY",
    status: "unknown",
    consecutive_failures: 0,
    last_success: null,
    last_failure: null,
    last_rate_date: "2026-08-02",
    response_time_ms: 420,
    updated_at: "2026-08-02T08:00:05.000Z",
  },
  {
    bank_code: "CBE",
    status: "healthy",
    consecutive_failures: 0,
    last_success: "2026-08-02T08:00:00.000Z",
    last_failure: null,
    last_rate_date: "2026-08-02",
    response_time_ms: 300,
    updated_at: "2026-08-02T08:00:05.000Z",
  },
  {
    bank_code: "DASH",
    status: "degraded",
    consecutive_failures: 2,
    last_success: "2026-08-01T08:00:00.000Z",
    last_failure: "2026-08-02T08:00:00.000Z",
    last_rate_date: "2026-08-01",
    response_time_ms: null,
    updated_at: "2026-08-02T08:00:05.000Z",
  },
  {
    bank_code: "ZZZ",
    status: "failed",
    consecutive_failures: 5,
    last_success: null,
    last_failure: "2026-08-02T08:00:00.000Z",
    last_rate_date: null,
    response_time_ms: null,
    updated_at: "2026-08-02T08:00:05.000Z",
  },
];
