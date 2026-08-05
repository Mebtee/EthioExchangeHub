import { describe, expect, it } from "vitest";

import {
  compareIsoDates,
  filterByDateRange,
  isStaleRate,
  markStale,
  resolveLatestWithManualOverrides,
  type ResolvableRate,
} from "@/services/helpers/RateResolution";

describe("compareIsoDates", () => {
  it("orders dates chronologically", () => {
    expect(compareIsoDates("2026-07-01", "2026-08-01")).toBe(-1);
    expect(compareIsoDates("2026-08-01", "2026-07-01")).toBe(1);
    expect(compareIsoDates("2026-08-01", "2026-08-01")).toBe(0);
  });
});

describe("isStaleRate", () => {
  const today = "2026-08-05";

  it("marks rows older than the window as stale", () => {
    expect(isStaleRate("2026-07-28", today, 7)).toBe(true);
  });

  it("keeps rows inside the window fresh", () => {
    expect(isStaleRate("2026-07-29", today, 7)).toBe(false); // exactly 7 days old
    expect(isStaleRate("2026-08-05", today, 7)).toBe(false);
  });

  it("treats the window as exclusive of the boundary day", () => {
    // 07-29 is exactly `today - 7` → the cutoff day itself is NOT stale.
    expect(isStaleRate("2026-07-29", today, 7)).toBe(false);
    expect(isStaleRate("2026-07-28", today, 7)).toBe(true);
  });

  it("never marks anything stale when the window is 0", () => {
    expect(isStaleRate("2020-01-01", today, 0)).toBe(false);
  });
});

describe("markStale", () => {
  it("annotates every row without dropping any", () => {
    const rows = [
      { rate_date: "2026-07-28" },
      { rate_date: "2026-08-05" },
      { rate_date: "2026-07-15" },
    ];
    const marked = markStale(rows, "2026-08-05", 7);
    expect(marked).toEqual([
      { rate_date: "2026-07-28", stale: true },
      { rate_date: "2026-08-05", stale: false },
      { rate_date: "2026-07-15", stale: true },
    ]);
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

describe("resolveLatestWithManualOverrides", () => {
  const single = () => "";

  it("keeps the newest rate_date per group", () => {
    const rows: ResolvableRate[] = [
      {
        id: "old",
        rate_date: "2026-07-30",
        source: "SCRAPER",
        scraped_at: "2026-07-30T08:00:00.000Z",
      },
      {
        id: "new",
        rate_date: "2026-08-05",
        source: "SCRAPER",
        scraped_at: "2026-08-05T09:00:00.000Z",
      },
      {
        id: "mid",
        rate_date: "2026-08-01",
        source: "SCRAPER",
        scraped_at: "2026-08-01T08:00:00.000Z",
      },
    ];
    expect(resolveLatestWithManualOverrides(rows, single).map((r) => r.id)).toEqual(["new"]);
  });

  it("lets a manual override beat a scraped row on the same rate_date", () => {
    const rows: ResolvableRate[] = [
      {
        id: "scraped",
        rate_date: "2026-08-01",
        source: "SCRAPER",
        scraped_at: "2026-08-01T09:00:00.000Z",
      },
      { id: "manual", rate_date: "2026-08-01", source: "MANUAL", scraped_at: null },
    ];
    expect(resolveLatestWithManualOverrides(rows, single)[0]?.id).toBe("manual");
  });

  it("prefers the newest scraped_at for the same source and rate_date", () => {
    const rows: ResolvableRate[] = [
      {
        id: "early",
        rate_date: "2026-08-05",
        source: "SCRAPER",
        scraped_at: "2026-08-05T06:00:00.000Z",
      },
      {
        id: "late",
        rate_date: "2026-08-05",
        source: "SCRAPER",
        scraped_at: "2026-08-05T09:30:00.000Z",
      },
    ];
    // The "late" row is passed FIRST — the winner must still be decided by
    // scraped_at, not by input order.
    const out = resolveLatestWithManualOverrides(rows, single);
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("late");
  });

  it("falls back to the newest id when source and scraped_at tie", () => {
    const rows: ResolvableRate[] = [
      {
        id: "id-1",
        rate_date: "2026-08-05",
        source: "SCRAPER",
        scraped_at: "2026-08-05T09:30:00.000Z",
      },
      {
        id: "id-2",
        rate_date: "2026-08-05",
        source: "SCRAPER",
        scraped_at: "2026-08-05T09:30:00.000Z",
      },
    ];
    expect(resolveLatestWithManualOverrides(rows, single)[0]?.id).toBe("id-2");
  });

  it("falls back to the newest id for manual-only ties (no scraped_at)", () => {
    const rows: ResolvableRate[] = [
      { id: "manual-1", rate_date: "2026-08-05", source: "MANUAL", scraped_at: null },
      { id: "manual-2", rate_date: "2026-08-05", source: "MANUAL", scraped_at: null },
    ];
    expect(resolveLatestWithManualOverrides(rows, single)[0]?.id).toBe("manual-2");
  });

  it("resolves each group independently by key", () => {
    const rows: ResolvableRate[] = [
      {
        id: "a-old",
        rate_date: "2026-08-01",
        source: "SCRAPER",
        scraped_at: "2026-08-01T08:00:00.000Z",
      },
      {
        id: "a-new",
        rate_date: "2026-08-05",
        source: "SCRAPER",
        scraped_at: "2026-08-05T09:00:00.000Z",
      },
      {
        id: "b-old",
        rate_date: "2026-08-01",
        source: "SCRAPER",
        scraped_at: "2026-08-01T08:00:00.000Z",
      },
      {
        id: "b-new",
        rate_date: "2026-08-04",
        source: "SCRAPER",
        scraped_at: "2026-08-04T08:00:00.000Z",
      },
    ];
    const resolved = resolveLatestWithManualOverrides(rows, (r) =>
      r.id!.startsWith("a") ? "A" : "B",
    );
    expect(resolved.map((r) => r.id)).toEqual(["a-new", "b-new"]);
  });
});
