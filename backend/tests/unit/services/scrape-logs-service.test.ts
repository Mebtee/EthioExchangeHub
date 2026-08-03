import { describe, expect, it } from "vitest";

import { ScrapeLogsServiceImpl } from "@/services/ScrapeLogsService";

import { scrapeLogs } from "../../fixtures/scrape-logs";
import { createMockScrapeLogsRepository } from "../../mocks/repositories";

function makeService() {
  const repository = createMockScrapeLogsRepository();
  const service = new ScrapeLogsServiceImpl(repository);
  return { service, repository };
}

describe("ScrapeLogsServiceImpl.listLogs", () => {
  it("orders newest-first by ran_at with id tie-break", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(scrapeLogs);
    const rows = await service.listLogs();
    expect(rows[0]?.id).toBe("log-2");
    expect(rows[rows.length - 1]?.id).toBe("log-4"); // null ran_at last
  });

  it("filters by bank, run, status, and scenario", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(scrapeLogs);
    expect(await service.listLogs({ bankCode: "ABY" })).toHaveLength(2);
    expect(await service.listLogs({ runId: "run-b" })).toHaveLength(2);
    expect(await service.listLogs({ status: "failed" })).toHaveLength(1);
    expect(await service.listLogs({ scenario: "stale" })).toHaveLength(1);
  });

  it("applies limit and offset", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(scrapeLogs);
    const page = await service.listLogs(undefined, { limit: 2, offset: 1 });
    expect(page).toHaveLength(2);
  });

  it("treats a negative limit as unbounded and clamps negative offsets", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(scrapeLogs);
    expect(await service.listLogs(undefined, { limit: -1, offset: -5 })).toHaveLength(4);
  });
});

describe("ScrapeLogsServiceImpl.getLatestLogs", () => {
  it("passes the limit through", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(scrapeLogs);
    const rows = await service.getLatestLogs(2);
    expect(rows).toHaveLength(2);
  });
});

describe("ScrapeLogsServiceImpl.getLogsByBank", () => {
  it("filters by bank code", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(scrapeLogs);
    const rows = await service.getLogsByBank("CBE");
    expect(rows.map((r) => r.id)).toEqual(["log-2"]);
  });
});

describe("ScrapeLogsServiceImpl.getLogsByRun", () => {
  it("filters by run id with pagination", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(scrapeLogs);
    const rows = await service.getLogsByRun("run-a", { limit: 1 });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.run_id).toBe("run-a");
  });
});
