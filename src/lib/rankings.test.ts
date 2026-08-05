import { describe, expect, it } from "vitest";

import type { ExchangeRate } from "@/types/exchange-rate";

import { buildRankings, dedupeLatestRates, getBestRate, getPrimaryCurrency } from "./rankings";

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

describe("dedupeLatestRates", () => {
  it("keeps the newest rate_date per bank + currency", () => {
    const rates = [
      rate({ bankName: "Awash Bank", currency: "USD", rateDate: "2026-07-30" }),
      rate({ bankName: "Awash Bank", currency: "USD", rateDate: "2026-08-01" }),
      rate({ bankName: "CBE", currency: "USD", rateDate: "2026-08-01" }),
    ];
    const deduped = dedupeLatestRates(rates);
    expect(deduped).toHaveLength(2);
    const abyUsd = deduped.find((r) => r.bankName === "Awash Bank");
    expect(abyUsd?.rateDate).toBe("2026-08-01");
  });

  it("keeps the first record on a same-rate_date tie (ties are backend-resolved)", () => {
    const rates = [
      rate({ bankName: "Awash Bank", rateDate: "2026-08-01", id: 101 }),
      rate({ bankName: "Awash Bank", rateDate: "2026-08-01", id: 202 }),
    ];
    const deduped = dedupeLatestRates(rates);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.id).toBe(101);
  });
});

describe("getPrimaryCurrency", () => {
  it("prefers USD when present", () => {
    expect(getPrimaryCurrency([rate({ currency: "EUR" }), rate({ currency: "USD" })])).toBe("USD");
  });

  it("falls back to the first currency otherwise", () => {
    expect(getPrimaryCurrency([rate({ currency: "GBP" })])).toBe("GBP");
  });

  it("returns an empty string for an empty list", () => {
    expect(getPrimaryCurrency([])).toBe("");
  });
});

describe("getBestRate", () => {
  it("finds the max buying rate for a currency", () => {
    const rates = [
      rate({ bankName: "Awash Bank", cashBuying: 121.5 }),
      rate({ bankName: "CBE", cashBuying: 122.0 }),
      rate({ bankName: "DASH", cashBuying: 121.0 }),
    ];
    expect(getBestRate(rates, "USD", "cashBuying", "max")?.bankName).toBe("CBE");
  });

  it("finds the min selling rate for a currency", () => {
    const rates = [
      rate({ bankName: "Awash Bank", cashSelling: 122.5 }),
      rate({ bankName: "CBE", cashSelling: 122.0 }),
    ];
    expect(getBestRate(rates, "USD", "cashSelling", "min")?.bankName).toBe("CBE");
  });

  it("returns undefined when no finite value exists for the field", () => {
    const rates = [rate({ currency: "USD", transactionBuying: Number.NaN })];
    expect(getBestRate(rates, "USD", "transactionBuying", "max")).toBeUndefined();
  });
});

describe("buildRankings", () => {
  it("sorts buying desc and selling asc, skipping non-finite values", () => {
    const rates = [
      rate({ bankName: "Awash Bank", cashBuying: 121.5 }),
      rate({ bankName: "CBE", cashBuying: 122.0 }),
      rate({ bankName: "DASH", cashBuying: Number.NaN }),
    ];
    const buying = buildRankings(rates, { field: "cashBuying" });
    expect(buying.map((r) => r.bankName)).toEqual(["CBE", "Awash Bank"]);
    expect(buying.map((r) => r.rank)).toEqual([1, 2]);

    const selling = buildRankings(rates, { field: "cashSelling" });
    expect(selling[0]?.rank).toBe(1);
  });

  it("filters by currency and search query", () => {
    const rates = [
      rate({ bankName: "Awash Bank", currency: "USD" }),
      rate({ bankName: "CBE", currency: "EUR" }),
      rate({ bankName: "Awash Bank", currency: "EUR" }),
    ];
    const eur = buildRankings(rates, { field: "cashBuying", currency: "EUR" });
    expect(eur).toHaveLength(2);

    const search = buildRankings(rates, { field: "cashBuying", query: "awash" });
    expect(search.every((r) => r.bankName === "Awash Bank")).toBe(true);
  });
});
