import { describe, expect, it } from "vitest";

import type { ExchangeRate } from "@/types/exchange-rate";

import {
  buildRankings,
  dedupeLatestRates,
  filterToCurrentBusinessDay,
  filterToLatestBusinessDay,
  getBestRate,
  getLatestBusinessDate,
  getPrimaryCurrency,
} from "./rankings";

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

describe("getLatestBusinessDate", () => {
  it("returns the newest rate_date for the selected currency only", () => {
    const rates = [
      rate({ bankName: "Awash Bank", currency: "USD", rateDate: "2026-08-08" }),
      rate({ bankName: "CBE", currency: "USD", rateDate: "2026-08-09" }),
      rate({ bankName: "CBE", currency: "EUR", rateDate: "2026-08-10" }),
    ];
    expect(getLatestBusinessDate(rates, "USD")).toBe("2026-08-09");
  });

  it("returns undefined when the currency has no records", () => {
    expect(getLatestBusinessDate([rate({ currency: "USD" })], "EUR")).toBeUndefined();
    expect(getLatestBusinessDate([], "USD")).toBeUndefined();
  });
});

describe("filterToLatestBusinessDay", () => {
  it("keeps only the currency's rows on its latest business date", () => {
    const rates = [
      rate({ bankName: "Hibret Bank", currency: "USD", rateDate: "2026-08-09" }),
      rate({ bankName: "Zemen Bank", currency: "USD", rateDate: "2026-08-09" }),
      rate({ bankName: "Abay Bank", currency: "USD", rateDate: "2026-08-08" }),
      rate({ bankName: "CBE", currency: "EUR", rateDate: "2026-08-09" }),
    ];
    const filtered = filterToLatestBusinessDay(rates, "USD");
    expect(filtered).toHaveLength(2);
    expect(filtered.every((r) => r.rateDate === "2026-08-09" && r.currency === "USD")).toBe(true);
    expect(filtered.map((r) => r.bankName).sort()).toEqual(["Hibret Bank", "Zemen Bank"]);
  });

  it("returns an empty list when the currency has no rows", () => {
    expect(filterToLatestBusinessDay([rate({ currency: "USD" })], "EUR")).toEqual([]);
    expect(filterToLatestBusinessDay([], "USD")).toEqual([]);
  });
});

describe("latest business date rule", () => {
  it("selects the latest business date and keeps only that day's banks (Test 1)", () => {
    const rates = [
      rate({ bankName: "Bank A", rateDate: "2026-08-10", cashBuying: 121.5 }),
      rate({ bankName: "Bank B", rateDate: "2026-08-10", cashBuying: 122.5 }),
      rate({ bankName: "Bank C", rateDate: "2026-08-09", cashBuying: 130 }),
    ];

    expect(getLatestBusinessDate(rates, "USD")).toBe("2026-08-10");
    const current = filterToLatestBusinessDay(rates, "USD");
    expect(current.map((r) => r.bankName).sort()).toEqual(["Bank A", "Bank B"]);
    expect(current.every((r) => r.rateDate === "2026-08-10")).toBe(true);
  });

  it("is dynamic — a newer rate_date becomes the latest date with no code change (Test 2)", () => {
    const rates = [
      rate({ bankName: "Bank A", rateDate: "2026-08-11", cashBuying: 122 }),
      rate({ bankName: "Bank B", rateDate: "2026-08-11", cashBuying: 121 }),
      rate({ bankName: "Bank C", rateDate: "2026-08-10", cashBuying: 130 }),
    ];

    expect(getLatestBusinessDate(rates, "USD")).toBe("2026-08-11");
    const current = filterToLatestBusinessDay(rates, "USD");
    expect(current.map((r) => r.bankName).sort()).toEqual(["Bank A", "Bank B"]);
  });

  it("determines the latest date per currency (Test 3)", () => {
    const rates = [
      rate({ currency: "USD", rateDate: "2026-08-10" }),
      rate({ currency: "EUR", rateDate: "2026-08-09" }),
    ];

    expect(getLatestBusinessDate(rates, "USD")).toBe("2026-08-10");
    expect(getLatestBusinessDate(rates, "EUR")).toBe("2026-08-09");
    expect(filterToLatestBusinessDay(rates, "USD").map((r) => r.rateDate)).toEqual(["2026-08-10"]);
    expect(filterToLatestBusinessDay(rates, "EUR").map((r) => r.rateDate)).toEqual(["2026-08-09"]);
  });

  it("does not fall back to a previous date even when it has more banks (Test 4)", () => {
    const rates = [
      rate({ bankName: "Bank A", rateDate: "2026-08-10", cashBuying: 121 }),
      rate({ bankName: "Bank A", rateDate: "2026-08-09", cashBuying: 119 }),
      rate({ bankName: "Bank B", rateDate: "2026-08-09", cashBuying: 120 }),
      rate({ bankName: "Bank C", rateDate: "2026-08-09", cashBuying: 118 }),
    ];

    const current = filterToLatestBusinessDay(rates, "USD");
    expect(current.map((r) => r.bankName)).toEqual(["Bank A"]);
    expect(current.every((r) => r.rateDate === "2026-08-10")).toBe(true);
  });

  it("returns a clean empty state when the currency has no rates (Test 5)", () => {
    expect(getLatestBusinessDate([], "USD")).toBeUndefined();
    expect(filterToLatestBusinessDay([], "USD")).toEqual([]);
    expect(filterToLatestBusinessDay([rate({ currency: "EUR" })], "USD")).toEqual([]);
  });
});

describe("filterToCurrentBusinessDay", () => {
  it("keeps rows on each currency's own latest business date", () => {
    const rates = [
      rate({ bankName: "Bank A", currency: "USD", rateDate: "2026-08-10" }),
      rate({ bankName: "Bank B", currency: "USD", rateDate: "2026-08-09" }),
      rate({ bankName: "Bank C", currency: "EUR", rateDate: "2026-08-09" }),
    ];

    const current = filterToCurrentBusinessDay(rates);
    expect(current.map((r) => r.bankName).sort()).toEqual(["Bank A", "Bank C"]);
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

  it("ranks only banks on the latest business date; older rows never participate (Test 7)", () => {
    const rates = [
      rate({ bankName: "Bank A", rateDate: "2026-08-10", cashBuying: 121.5 }),
      rate({ bankName: "Bank B", rateDate: "2026-08-10", cashBuying: 122.5 }),
      // Numerically best but published a day earlier — must be excluded.
      rate({ bankName: "Bank C", rateDate: "2026-08-09", cashBuying: 130 }),
    ];

    const current = filterToLatestBusinessDay(rates, "USD");
    const rankings = buildRankings(current, { field: "cashBuying", currency: "USD" });

    expect(rankings.map((r) => r.bankName)).toEqual(["Bank B", "Bank A"]);
    expect(rankings.map((r) => r.rank)).toEqual([1, 2]);
    expect(rankings.some((r) => r.bankName === "Bank C")).toBe(false);
  });
});
