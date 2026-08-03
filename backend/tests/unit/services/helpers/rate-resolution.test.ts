import { describe, expect, it } from "vitest";

import {
  compareIsoDates,
  filterByDateRange,
  resolveLatestPerKey,
} from "@/services/helpers/RateResolution";

describe("compareIsoDates", () => {
  it("orders dates chronologically", () => {
    expect(compareIsoDates("2026-07-01", "2026-08-01")).toBe(-1);
    expect(compareIsoDates("2026-08-01", "2026-07-01")).toBe(1);
    expect(compareIsoDates("2026-08-01", "2026-08-01")).toBe(0);
  });
});

describe("resolveLatestPerKey", () => {
  const rows = [
    { bank_code: "ABY", rate_date: "2026-07-30" },
    { bank_code: "ABY", rate_date: "2026-08-01" },
    { bank_code: "CBE", rate_date: "2026-08-01" },
  ];

  it("keeps the newest row per key", () => {
    const resolved = resolveLatestPerKey(rows, (r) => r.bank_code);
    expect(resolved).toHaveLength(2);
    const aby = resolved.find((r) => r.bank_code === "ABY");
    expect(aby?.rate_date).toBe("2026-08-01");
  });

  it("preserves first-occurrence key order", () => {
    const resolved = resolveLatestPerKey(rows, (r) => r.bank_code);
    expect(resolved.map((r) => r.bank_code)).toEqual(["ABY", "CBE"]);
  });

  it("returns an empty array for no input", () => {
    expect(resolveLatestPerKey([], () => "k")).toEqual([]);
  });
});

describe("filterByDateRange", () => {
  const rows = [
    { rate_date: "2026-07-01" },
    { rate_date: "2026-07-15" },
    { rate_date: "2026-08-01" },
  ];

  it("filters by from only", () => {
    const out = filterByDateRange(rows, { from: "2026-07-15" });
    expect(out).toHaveLength(2);
  });

  it("filters by to only", () => {
    const out = filterByDateRange(rows, { to: "2026-07-15" });
    expect(out).toHaveLength(2);
  });

  it("filters by both bounds", () => {
    const out = filterByDateRange(rows, { from: "2026-07-15", to: "2026-08-01" });
    expect(out).toHaveLength(2);
  });

  it("returns everything when no range is given", () => {
    expect(filterByDateRange(rows, undefined)).toHaveLength(3);
    expect(filterByDateRange(rows, {})).toHaveLength(3);
  });
});
