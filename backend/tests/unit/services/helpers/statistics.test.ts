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
  it("counts buckets and computes averages over non-null values", () => {
    const summary = summarizeHealth(scraperHealth);
    expect(summary.total).toBe(4);
    expect(summary.healthy).toBe(1);
    expect(summary.degraded).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.unknown).toBe(1);
    expect(summary.averageResponseTimeMs).toBe(360); // (420 + 300) / 2
    expect(summary.averageConsecutiveFailures).toBe(1.75); // (0+0+2+5)/4 — all four rows have a value
  });

  it("returns null averages when no row has values", () => {
    const rows = [{ ...scraperHealth[0]!, response_time_ms: null, consecutive_failures: null }];
    const summary = summarizeHealth(rows);
    expect(summary.averageResponseTimeMs).toBeNull();
    expect(summary.averageConsecutiveFailures).toBeNull();
    expect(summary.unknown).toBe(1);
  });

  it("handles an empty row set", () => {
    const summary = summarizeHealth([]);
    expect(summary.total).toBe(0);
    expect(summary.averageResponseTimeMs).toBeNull();
  });
});
