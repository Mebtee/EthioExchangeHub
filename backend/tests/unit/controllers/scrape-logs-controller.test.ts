import { describe, expect, it } from "vitest";

import { ScrapeLogsController } from "@/controllers/ScrapeLogsController";
import { DatabaseError } from "@/lib/errors";

import { scrapeLogs } from "../../fixtures/scrape-logs";
import {
  createMockNext,
  createMockRequest,
  createMockResponse,
  flushPromises,
} from "../../mocks/express";
import { createMockScrapeLogsService } from "../../mocks/services";

function makeController() {
  const service = createMockScrapeLogsService();
  const controller = new ScrapeLogsController(service);
  return { service, controller };
}

describe("ScrapeLogsController.getLogs", () => {
  it("reads filters and numeric pagination into the service call", async () => {
    const { service, controller } = makeController();
    service.listLogs.mockResolvedValue(scrapeLogs);

    controller.getLogs(
      createMockRequest({
        query: { bankCode: "ABY", status: "success", limit: "5", offset: "2" },
      }),
      createMockResponse(),
      createMockNext(),
    );
    await flushPromises();

    expect(service.listLogs).toHaveBeenCalledWith(
      { bankCode: "ABY", status: "success" },
      { limit: 5, offset: 2 },
    );
  });

  it("omits non-numeric pagination values instead of passing NaN", async () => {
    const { service, controller } = makeController();
    service.listLogs.mockResolvedValue([]);

    controller.getLogs(
      createMockRequest({ query: { limit: "abc", offset: "xyz" } }),
      createMockResponse(),
      createMockNext(),
    );
    await flushPromises();

    expect(service.listLogs).toHaveBeenCalledWith({}, {});
  });

  it("sends the success envelope", async () => {
    const { service, controller } = makeController();
    service.listLogs.mockResolvedValue(scrapeLogs);
    const res = createMockResponse();

    controller.getLogs(createMockRequest(), res, createMockNext());
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Scrape logs retrieved.",
      data: scrapeLogs,
    });
  });
});

describe("ScrapeLogsController.getLogsByRunId", () => {
  it("delegates with the runId param and pagination options", async () => {
    const { service, controller } = makeController();
    service.getLogsByRun.mockResolvedValue(scrapeLogs);

    controller.getLogsByRunId(
      createMockRequest({ params: { runId: "run-a" }, query: { limit: "10" } }),
      createMockResponse(),
      createMockNext(),
    );
    await flushPromises();

    expect(service.getLogsByRun).toHaveBeenCalledWith("run-a", { limit: 10 });
  });

  it("forwards errors to next", async () => {
    const { service, controller } = makeController();
    const error = new DatabaseError("db down");
    service.getLogsByRun.mockRejectedValue(error);
    const next = createMockNext();

    controller.getLogsByRunId(
      createMockRequest({ params: { runId: "run-a" } }),
      createMockResponse(),
      next,
    );
    await flushPromises();

    expect(next).toHaveBeenCalledWith(error);
  });
});
