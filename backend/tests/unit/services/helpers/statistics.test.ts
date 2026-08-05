import { describe, expect, it } from "vitest";

import { categorizeScraperStatus, summarizeHealth } from "@/services/helpers/Statistics";

import { scraperHealth } from "../../../fixtures/scraper-health";

describe("categorizeScraperStatus", () => {
  it("maps each bucket", () => {
    expect(categorizeScraperStatus("healthy")).toBe("healthy");
    expect(categorizeScraperStatus("degraded")).toBe("degraded");
    expect(categorizeScraperStatus("failed")).toBe("failed");
    expect(categorizeScraperStatus("offline")).toBe("failed");
    expect(categorizeScraperStatus("error")).toBe("failed");
    expect(categorizeScraperStatus("unknown")).toBe("unknown");
    expect(categorizeScraperStatus("whatever")).toBe("unknown");
  });
});

describe("summarizeHealth", () => {
  // Fixtures: ABY (08-02), CBE (08-02), DASH (08-01), ZZZ (null).
  const today = "2026-08-05";
  const maxAgeDays = 7; // cutoff 2026-07-29

  it("counts buckets and computes averages over non-null values", () => {
    const summary = summarizeHealth(scraperHealth, today, maxAgeDays);
    expect(summary.total).toBe(4);
    expect(summary.healthy).toBe(1);
    expect(summary.degraded).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.unknown).toBe(1);
    expect(summary.averageResponseTimeMs).toBe(360); // (420 + 300) / 2
    expect(summary.averageConsecutiveFailures).toBe(1.75); // (0+0+2+5)/4 — all four rows have a value
    // ABY/CBE/DASH are inside the window; ZZZ has no rate → 1 stale.
    expect(summary.staleCount).toBe(1);
  });

  it("counts every row as stale when all rates are old or missing", () => {
    const summary = summarizeHealth(scraperHealth, today, 1); // cutoff 2026-08-04
    expect(summary.staleCount).toBe(4); // 08-02, 08-02, 08-01 all < 08-04, ZZZ null
  });

  it("returns null averages when no row has values", () => {
    const rows = [{ ...scraperHealth[0]!, response_time_ms: null, consecutive_failures: null }];
    const summary = summarizeHealth(rows, today, maxAgeDays);
    expect(summary.averageResponseTimeMs).toBeNull();
    expect(summary.averageConsecutiveFailures).toBeNull();
    expect(summary.unknown).toBe(1);
  });

  it("handles an empty row set", () => {
    const summary = summarizeHealth([], today, maxAgeDays);
    expect(summary.total).toBe(0);
    expect(summary.averageResponseTimeMs).toBeNull();
    expect(summary.staleCount).toBe(0);
  });
});
