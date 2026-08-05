import { describe, expect, it } from "vitest";

import {
  mapExchangeRateRow,
  mapManualRateRow,
  mapScrapeLogRow,
  mapScraperHealthRow,
  type BackendExchangeRateRow,
  type BackendManualRateRow,
  type BackendScrapeLogRow,
  type BackendScraperHealthRow,
} from "./adapters";

function rateRow(overrides: Partial<BackendExchangeRateRow> = {}): BackendExchangeRateRow {
  return {
    id: "rate-1",
    bank_code: "ABY",
    currency_code: "USD",
    buying_rate: 121.5,
    selling_rate: 122.5,
    transactional_buying: null,
    transactional_selling: null,
    weighted_avg_buying: null,
    weighted_avg_selling: null,
    rate_date: "2026-08-01",
    source: "SCRAPER",
    scraped_at: "2026-08-01T08:00:00.000Z",
    stale: false,
    ...overrides,
  };
}

describe("mapExchangeRateRow", () => {
  it("maps a resolved row and keeps the bank name from the lookup", () => {
    const rate = mapExchangeRateRow(rateRow(), "Awash Bank");
    expect(rate).toMatchObject({
      bankCode: "ABY",
      bankName: "Awash Bank",
      currency: "USD",
      cashBuying: 121.5,
      cashSelling: 122.5,
      rateDate: "2026-08-01",
      stale: false,
    });
  });

  it("maps a null rate column to NaN instead of faking a value (D5)", () => {
    const rate = mapExchangeRateRow(
      rateRow({ transactional_buying: null, transactional_selling: null }),
    );
    expect(rate.transactionBuying).toBeNaN();
    expect(rate.transactionSelling).toBeNaN();
  });

  it("carries the stale flag through (D2)", () => {
    expect(mapExchangeRateRow(rateRow({ stale: true })).stale).toBe(true);
  });

  it("normalizes the source without exposing scraped_at to the public model", () => {
    const rate = mapExchangeRateRow(rateRow({ source: "  scraper  ", scraped_at: null }));
    expect(rate.source).toBe("scraper");
    expect("lastUpdated" in rate).toBe(false);
  });

  it("keys the row identity by rate_date, ignoring scraped_at (operational metadata)", () => {
    const withMorningScrape = mapExchangeRateRow(
      rateRow({ scraped_at: "2026-08-01T06:00:00.000Z" }),
    );
    const withEveningScrape = mapExchangeRateRow(
      rateRow({ scraped_at: "2026-08-01T18:00:00.000Z" }),
    );
    expect(withMorningScrape.id).toBe(withEveningScrape.id);

    const nextDay = mapExchangeRateRow(rateRow({ rate_date: "2026-08-02" }));
    expect(nextDay.id).not.toBe(withMorningScrape.id);
  });
});

describe("mapManualRateRow", () => {
  it("maps the manual-rate row", () => {
    const row: BackendManualRateRow = {
      id: "manual-1",
      bank_code: "ABY",
      currency_code: "USD",
      buying_rate: 121.4,
      selling_rate: 122.2,
      rate_date: "2026-08-02",
      entered_by: "user-1",
      note: "Adjusted",
      created_at: "2026-08-02T09:00:00.000Z",
    };
    expect(mapManualRateRow(row, "Awash Bank")).toMatchObject({
      id: "manual-1",
      bankCode: "ABY",
      bankName: "Awash Bank",
      buyingRate: 121.4,
      note: "Adjusted",
    });
  });
});

describe("mapScrapeLogRow", () => {
  it("maps success to success and anything else to failed (D3)", () => {
    const base: Omit<BackendScrapeLogRow, "status"> = {
      id: "log-1",
      run_id: "run-1",
      bank_code: "ABY",
      scenario: "updated",
      currencies_count: 25,
      error_message: null,
      duration_ms: 800,
      ran_at: "2026-08-02T08:00:00.000Z",
    };
    expect(mapScrapeLogRow({ ...base, status: "success" }).status).toBe("success");
    expect(mapScrapeLogRow({ ...base, status: "error" }).status).toBe("failed");
    expect(mapScrapeLogRow({ ...base, status: "warning" }).status).toBe("failed");
    expect(mapScrapeLogRow({ ...base, status: "  ERROR " }).status).toBe("failed");
  });

  it("falls back to the scenario text when there is no error message", () => {
    const row: BackendScrapeLogRow = {
      id: "log-1",
      run_id: "run-1",
      bank_code: "ABY",
      status: "success",
      scenario: "unchanged",
      currencies_count: null,
      error_message: null,
      duration_ms: null,
      ran_at: null,
    };
    expect(mapScrapeLogRow(row).message).toBe("unchanged");
    expect(mapScrapeLogRow(row).records).toBe(0);
  });
});

describe("mapScraperHealthRow", () => {
  it("maps raw status text to the canonical bucket (D3)", () => {
    const base: Omit<BackendScraperHealthRow, "status"> = {
      bank_code: "ABY",
      consecutive_failures: 0,
      last_success: null,
      last_failure: null,
      last_rate_date: "2026-08-02",
      response_time_ms: 420,
      updated_at: "2026-08-02T08:00:00.000Z",
    };
    expect(mapScraperHealthRow({ ...base, status: "healthy" }).status).toBe("healthy");
    expect(mapScraperHealthRow({ ...base, status: "degraded" }).status).toBe("degraded");
    expect(mapScraperHealthRow({ ...base, status: "failed" }).status).toBe("failed");
    expect(mapScraperHealthRow({ ...base, status: "unknown" }).status).toBe("unknown");
    expect(mapScraperHealthRow({ ...base, status: "weird text" }).status).toBe("unknown");
  });

  it("resolves the bank name from the lookup and preserves nulls", () => {
    const row = mapScraperHealthRow(
      {
        bank_code: "DASH",
        status: "degraded",
        consecutive_failures: 2,
        last_success: null,
        last_failure: "2026-08-02T08:00:00.000Z",
        last_rate_date: null,
        response_time_ms: null,
        updated_at: null,
      },
      "Dashen Bank",
    );
    expect(row).toMatchObject({
      bankCode: "DASH",
      bankName: "Dashen Bank",
      status: "degraded",
      consecutiveFailures: 2,
      lastRateDate: null,
      responseTimeMs: null,
    });
  });
});
