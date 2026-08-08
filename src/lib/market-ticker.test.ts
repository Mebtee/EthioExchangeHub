import { describe, expect, it } from "vitest";

import type { ExchangeRate } from "@/types/exchange-rate";

import { buildMarketTicker } from "./market-ticker";

function rate(overrides: Partial<ExchangeRate>): ExchangeRate {
  return {
    id: 1,
    bankId: 1,
    bankCode: "ABY",
    bankName: "Awash Bank",
    currency: "USD",
    cashBuying: 121.5,
    cashSelling: 122.5,
    transactionBuying: Number.NaN,
    transactionSelling: Number.NaN,
    rateDate: "2026-08-01",
    source: "scraper",
    stale: false,
    logo: "",
    ...overrides,
  };
}

describe("buildMarketTicker", () => {
  it("returns an empty list for an empty input", () => {
    expect(buildMarketTicker([])).toEqual([]);
  });

  it("averages cash buy/sell across banks on the currency's newest rate_date", () => {
    const items = buildMarketTicker([
      rate({
        bankCode: "ABY",
        bankName: "Awash Bank",
        cashBuying: 121.5,
        cashSelling: 122.5,
        change: 1.25,
      }),
      rate({ bankCode: "CBE", bankName: "CBE", cashBuying: 119.5, cashSelling: 120.5 }),
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      pair: "USD/ETB",
      buy: 120.5,
      sell: 121.5,
      rateDate: "2026-08-01",
      change: 1.25,
    });
  });

  it("excludes banks whose newest rate_date lags the currency's newest date", () => {
    const items = buildMarketTicker([
      rate({ bankCode: "ABY", bankName: "Awash Bank", cashBuying: 121.5, cashSelling: 122.5 }),
      rate({ bankCode: "CBE", bankName: "CBE", cashBuying: 119.5, cashSelling: 120.5 }),
      rate({
        bankCode: "BOA",
        bankName: "BoA",
        rateDate: "2026-07-30",
        cashBuying: 118.0,
        cashSelling: 119.0,
      }),
    ]);

    expect(items).toHaveLength(1);
    // The lagging 07-30 row must not drag the average down.
    expect(items[0]).toMatchObject({ buy: 120.5, sell: 121.5, rateDate: "2026-08-01" });
  });

  it("ignores null cash sides and drops currencies with no cash rates at all", () => {
    const items = buildMarketTicker([
      rate({ bankCode: "ABY", bankName: "Awash Bank", cashBuying: 121.5, cashSelling: Number.NaN }),
      rate({ bankCode: "CBE", bankName: "CBE", cashBuying: Number.NaN, cashSelling: 120.5 }),
      rate({
        currency: "DJF",
        bankName: "Djibouti",
        cashBuying: Number.NaN,
        cashSelling: Number.NaN,
      }),
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ buy: 121.5, sell: 120.5 });
  });

  it("reports a null change when no bank publishes a rate_date change", () => {
    const items = buildMarketTicker([
      rate({ bankCode: "ABY", bankName: "Awash Bank", cashBuying: 121.5, cashSelling: 122.5 }),
      rate({ bankCode: "CBE", bankName: "CBE", cashBuying: 119.5, cashSelling: 120.5 }),
    ]);

    expect(items[0]?.change).toBeNull();
  });

  it("averages only the changes that exist, leaving the rest out", () => {
    const items = buildMarketTicker([
      rate({
        bankCode: "ABY",
        bankName: "Awash Bank",
        cashBuying: 121.5,
        cashSelling: 122.5,
        change: 1.25,
      }),
      rate({
        bankCode: "CBE",
        bankName: "CBE",
        cashBuying: 119.5,
        cashSelling: 120.5,
        change: -0.25,
      }),
    ]);

    expect(items[0]?.change).toBe(0.5);
  });

  it("orders preferred major currencies first, then the rest alphabetically", () => {
    const items = buildMarketTicker([
      rate({ currency: "KES", bankName: "Kenya" }),
      rate({ currency: "GBP", bankName: "UK" }),
      rate({ currency: "USD", bankName: "US" }),
      rate({ currency: "EUR", bankName: "Euro" }),
    ]);

    expect(items.map((item) => item.pair)).toEqual(["USD/ETB", "EUR/ETB", "GBP/ETB", "KES/ETB"]);
  });

  it("uses the newest business date as rateDate (never a scraped_at timestamp)", () => {
    const items = buildMarketTicker([
      rate({
        bankCode: "ABY",
        bankName: "Awash Bank",
        rateDate: "2026-07-30",
        cashBuying: 120,
        cashSelling: 121,
      }),
      rate({
        bankCode: "CBE",
        bankName: "CBE",
        rateDate: "2026-08-01",
        cashBuying: 119.5,
        cashSelling: 120.5,
      }),
    ]);

    expect(items[0]?.rateDate).toBe("2026-08-01");
  });
});
