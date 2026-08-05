import { describe, expect, it } from "vitest";

import { ScraperHealthServiceImpl } from "@/services/ScraperHealthService";

import { scraperHealth } from "../../fixtures/scraper-health";
import { createMockScraperHealthRepository } from "../../mocks/repositories";

function makeService() {
  const repository = createMockScraperHealthRepository();
  // Fixed reference date + window keep the staleness count deterministic.
  const service = new ScraperHealthServiceImpl(repository, 7, () => "2026-08-05");
  return { service, repository };
}

describe("ScraperHealthServiceImpl.getSummary", () => {
  it("computes the aggregate summary", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(scraperHealth);
    const summary = await service.getSummary();
    expect(summary.total).toBe(4);
    expect(summary.unknown).toBe(1);
    expect(summary.averageResponseTimeMs).toBe(360);
  });

  it("counts stale scrapers (D2): missing or outdated last_rate_date", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(scraperHealth);
    // ABY/CBE (08-02) and DASH (08-01) are within 7 days of 08-05;
    // ZZZ has no rate → 1 stale.
    expect((await service.getSummary()).staleCount).toBe(1);

    const narrow = new ScraperHealthServiceImpl(repository, 1, () => "2026-08-05");
    expect((await narrow.getSummary()).staleCount).toBe(4);
  });
});

describe("ScraperHealthServiceImpl bucket listings", () => {
  it("lists healthy rows alphabetically", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(scraperHealth);
    const rows = await service.listHealthy();
    expect(rows.map((r) => r.bank_code)).toEqual(["CBE"]);
  });

  it("lists degraded rows", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(scraperHealth);
    expect((await service.listDegraded()).map((r) => r.bank_code)).toEqual(["DASH"]);
  });

  it("lists failed rows", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(scraperHealth);
    expect((await service.listFailed()).map((r) => r.bank_code)).toEqual(["ZZZ"]);
  });
});

describe("ScraperHealthServiceImpl.listAll", () => {
  it("lists every health row alphabetically by bank code", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(scraperHealth);

    const rows = await service.listAll();
    expect(rows.map((r) => r.bank_code)).toEqual(["ABY", "CBE", "DASH", "ZZZ"]);
  });

  it("returns an empty list when no health rows exist", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue([]);
    expect(await service.listAll()).toEqual([]);
  });
});

describe("ScraperHealthServiceImpl.findByBankCode", () => {
  it("returns the row for a bank", async () => {
    const { service, repository } = makeService();
    repository.findByBankCode.mockResolvedValue(scraperHealth[0]!);
    expect((await service.findByBankCode("ABY"))?.status).toBe("unknown");
  });

  it("returns null when the bank has no row", async () => {
    const { service, repository } = makeService();
    repository.findByBankCode.mockResolvedValue(null);
    expect(await service.findByBankCode("NOPE")).toBeNull();
  });
});
