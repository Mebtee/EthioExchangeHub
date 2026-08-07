import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { ScrapeLogsRepository } from "@/repositories/ScrapeLogsRepository";
import { ScraperHealthServiceImpl } from "@/services/ScraperHealthService";
import type { Database } from "@/types/database";
import type { ScraperHealthRow } from "@/types/scraper-health";

import { scrapeLogs } from "../../fixtures/scrape-logs";
import { createFakeSupabaseClient } from "../../helpers/supabase-client";

/** Builds the real service over a real repository seeded with scrape logs. */
function makeService() {
  const client = createFakeSupabaseClient({ scrape_logs: [...scrapeLogs] });
  const repository = new ScrapeLogsRepository(client as unknown as SupabaseClient<Database>);
  // Fixed reference date + window keep the staleness count deterministic.
  const service = new ScraperHealthServiceImpl(repository, 7, () => "2026-08-05");
  return { service, repository };
}

describe("ScraperHealthServiceImpl.getSummary", () => {
  it("computes the aggregate summary", async () => {
    const { service } = makeService();
    const summary = await service.getSummary();
    expect(summary.total).toBe(3);
    expect(summary.healthy).toBe(2);
    expect(summary.degraded).toBe(0);
    expect(summary.failed).toBe(1);
    expect(summary.unknown).toBe(0);
    // (1820 + 1500 + 5000) / 3 and (0 + 0 + 1) / 3.
    expect(summary.averageResponseTimeMs).toBe(8320 / 3);
    expect(summary.averageConsecutiveFailures).toBe(1 / 3);
  });

  it("counts stale scrapers (D2): missing or outdated last successful run", async () => {
    const { service } = makeService();
    // ABY/CBE last succeeded 08-02 (within 7 days of 08-05); DASH never
    // succeeded → 1 stale.
    expect((await service.getSummary()).staleCount).toBe(1);

    const { repository } = makeService();
    const narrow = new ScraperHealthServiceImpl(repository, 1, () => "2026-08-05");
    expect((await narrow.getSummary()).staleCount).toBe(3);
  });
});

describe("ScraperHealthServiceImpl bucket listings", () => {
  it("lists healthy rows alphabetically", async () => {
    const { service } = makeService();
    const rows = await service.listHealthy();
    expect(rows.map((r) => r.bank_code)).toEqual(["ABY", "CBE"]);
  });

  it("lists degraded rows (none in the fixture)", async () => {
    const { service } = makeService();
    expect(await service.listDegraded()).toEqual([]);
  });

  it("lists failed rows", async () => {
    const { service } = makeService();
    expect((await service.listFailed()).map((r) => r.bank_code)).toEqual(["DASH"]);
  });
});

describe("ScraperHealthServiceImpl.listAll", () => {
  it("lists every health row alphabetically by bank code", async () => {
    const { service } = makeService();
    const rows = await service.listAll();
    expect(rows.map((r) => r.bank_code)).toEqual(["ABY", "CBE", "DASH"]);
  });

  it("returns an empty list when no scrape logs exist", async () => {
    const client = createFakeSupabaseClient({ scrape_logs: [] });
    const service = new ScraperHealthServiceImpl(
      new ScrapeLogsRepository(client as unknown as SupabaseClient<Database>),
      7,
      () => "2026-08-05",
    );
    expect(await service.listAll()).toEqual([]);
  });
});

describe("ScraperHealthServiceImpl.findByBankCode", () => {
  it("returns the row for a bank", async () => {
    const { service } = makeService();
    expect((await service.findByBankCode("ABY"))?.status).toBe("healthy");
  });

  it("returns null when the bank has no logs", async () => {
    const { service } = makeService();
    expect(await service.findByBankCode("NOPE")).toBeNull();
  });
});

describe("derived health row (DASH, only failures)", () => {
  it("flags a never-succeeded bank as failed with a null last_rate_date", async () => {
    const { service } = makeService();
    const dash = (await service.findByBankCode("DASH")) as ScraperHealthRow;
    expect(dash.status).toBe("failed");
    expect(dash.consecutive_failures).toBe(1);
    expect(dash.last_failure).toBe("2026-08-01T08:00:00.000Z");
    expect(dash.last_rate_date).toBeNull();
  });
});
