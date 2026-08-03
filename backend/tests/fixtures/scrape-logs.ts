import type { ScrapeLogRow } from "@/types/database";

/** Typed scrape-log fixtures (two runs, mixed statuses, null timestamps). */
export const scrapeLogs: ScrapeLogRow[] = [
  {
    id: "log-1",
    run_id: "run-a",
    bank_code: "ABY",
    status: "success",
    scenario: "updated",
    currencies_count: 23,
    error_message: null,
    duration_ms: 1820,
    ran_at: "2026-08-02T08:00:00.000Z",
  },
  {
    id: "log-2",
    run_id: "run-a",
    bank_code: "CBE",
    status: "success",
    scenario: "unchanged",
    currencies_count: 25,
    error_message: null,
    duration_ms: 1500,
    ran_at: "2026-08-02T08:00:01.000Z",
  },
  {
    id: "log-3",
    run_id: "run-b",
    bank_code: "DASH",
    status: "failed",
    scenario: "failed",
    currencies_count: 0,
    error_message: "Timeout",
    duration_ms: 5000,
    ran_at: "2026-08-01T08:00:00.000Z",
  },
  {
    id: "log-4",
    run_id: "run-b",
    bank_code: "ABY",
    status: "success",
    scenario: "stale",
    currencies_count: 20,
    error_message: null,
    duration_ms: null,
    ran_at: null,
  },
];
