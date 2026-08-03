import { describe, expect, it } from "vitest";

import { ScraperHealthServiceImpl } from "@/services/ScraperHealthService";

import { scraperHealth } from "../../fixtures/scraper-health";
import { createMockScraperHealthRepository } from "../../mocks/repositories";

function makeService() {
  const repository = createMockScraperHealthRepository();
  const service = new ScraperHealthServiceImpl(repository);
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
