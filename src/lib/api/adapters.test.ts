import { describe, expect, it } from "vitest";

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
} from "./adapters";

function bankRow(overrides: Partial<BackendBankRow> = {}): BackendBankRow {
  return {
    bank_code: "ABY",
    bank_name: "Awash Bank",
    bank_type: "private",
    source_url: null,
    is_active: true,
    created_at: "2026-01-15T09:30:00.000Z",
    total_assets: 91_300_000_000,
    total_deposite: 71_900_000_000,
    total_branches: 546,
    total_employee: 4_651,
    loan_to_deposite_ratio: 0.6843,
    return_on_asset: 0.0328,
    return_on_equity: 0.2458,
    profit_before_tax: 4_200_000_000,
    profit_after_tax: 3_000_000_000,
    retained_earning: 2_000_000_000,
    paid_up_capital: 7_000_000_000,
    reserves: 2_400_000_000,
    total_liabilities: 79_100_000_000,
    ...overrides,
  };
}

describe("mapBankRow", () => {
  it("maps the financial snapshot fields into the camelCase Bank model", () => {
    const bank = mapBankRow(bankRow());
    expect(bank).toMatchObject({
      slug: "ABY",
      name: "Awash Bank",
      type: "Private Bank",
      branches: 546,
      totalAssets: 91_300_000_000,
      totalDeposits: 71_900_000_000,
      totalEmployees: 4_651,
      loanToDepositRatio: 0.6843,
      returnOnAsset: 0.0328,
      returnOnEquity: 0.2458,
      profitBeforeTax: 4_200_000_000,
      profitAfterTax: 3_000_000_000,
      retainedEarnings: 2_000_000_000,
      paidUpCapital: 7_000_000_000,
      reserves: 2_400_000_000,
      totalLiabilities: 79_100_000_000,
    });
  });

  it("treats null financial columns as absent instead of zero", () => {
    const bank = mapBankRow(bankRow({ total_assets: null, total_branches: null }));
    expect(bank.totalAssets).toBeUndefined();
    expect(bank.branches).toBeUndefined();
  });
});

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
  it("maps the manual-rate row with all four rate values", () => {
    const row: BackendManualRateRow = {
      id: "manual-1",
      bank_code: "ABY",
      currency_code: "USD",
      buying_rate: 121.4,
      selling_rate: 122.2,
      transactional_buying: 125.1,
      transactional_selling: 126.2,
      rate_date: "2026-08-02",
      entered_by: "user-1",
      note: "Adjusted",
      created_at: "2026-08-02T09:00:00.000Z",
    };
    expect(mapManualRateRow(row, "Awash Bank")).toMatchObject({
      id: "manual-1",
      bankCode: "ABY",
      bankName: "Awash Bank",
      cashBuying: 121.4,
      cashSelling: 122.2,
      transactionBuying: 125.1,
      transactionSelling: 126.2,
      note: "Adjusted",
    });
  });

  it("maps null transactional values to NaN, never faking cash values", () => {
    const row: BackendManualRateRow = {
      id: "manual-1",
      bank_code: "ABY",
      currency_code: "USD",
      buying_rate: 121.4,
      selling_rate: 122.2,
      transactional_buying: null,
      transactional_selling: null,
      rate_date: "2026-08-02",
      entered_by: "user-1",
      note: "Adjusted",
      created_at: "2026-08-02T09:00:00.000Z",
    };
    const mapped = mapManualRateRow(row, "Awash Bank");
    expect(mapped.cashBuying).toBe(121.4);
    expect(mapped.transactionBuying).toBeNaN();
    expect(mapped.transactionSelling).toBeNaN();
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
