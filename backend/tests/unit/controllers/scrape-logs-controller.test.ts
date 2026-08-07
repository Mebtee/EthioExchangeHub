import { describe, expect, it } from "vitest";

import { ScrapeLogsController } from "@/controllers/ScrapeLogsController";
import { DatabaseError } from "@/lib/errors";
import { ScrapeLogsRepository } from "@/repositories/ScrapeLogsRepository";
import { ScrapeLogsServiceImpl } from "@/services/ScrapeLogsService";

import { scrapeLogs } from "../../fixtures/scrape-logs";
import { createMockNext, createMockRequest, createMockResponse } from "../../helpers/http";
import { createFakeSupabaseClient } from "../../helpers/supabase-client";

/** Builds the real controller over the real service + repository on a seeded client. */
function makeController() {
  const client = createFakeSupabaseClient({ scrape_logs: [...scrapeLogs] });
  const service = new ScrapeLogsServiceImpl(new ScrapeLogsRepository(client as unknown as never));
  const controller = new ScrapeLogsController(service);
  return { service, controller, client };
}

describe("ScrapeLogsController.getLogs", () => {
  it("reads filters and numeric pagination into the service call", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getLogs(
      createMockRequest({
        query: { bankCode: "ABY", status: "success", limit: "5", offset: "2" },
      }),
      res,
      createMockNext(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const payload = res.json.mock.calls[0]![0] as { data: Array<{ id: string }> };
    expect(payload).toMatchObject({ success: true, message: "Scrape logs retrieved." });
    // ABY logs newest-first: log-1 then log-4, offset 2 → empty page.
    expect(payload.data).toEqual([]);
  });

  it("omits non-numeric pagination values instead of passing NaN", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getLogs(
      createMockRequest({ query: { limit: "abc", offset: "xyz" } }),
      res,
      createMockNext(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const payload = res.json.mock.calls[0]![0] as { data: Array<{ id: string }> };
    expect(payload.data).toHaveLength(4);
  });

  it("sends the success envelope", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getLogs(createMockRequest(), res, createMockNext());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0]![0] as { data: Array<{ id: string }> };
    expect(payload.data.map((l) => l.id)).toEqual(["log-2", "log-1", "log-3", "log-4"]);
  });
});

describe("ScrapeLogsController.getLogsByRunId", () => {
  it("delegates with the runId param and pagination options", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getLogsByRunId(
      createMockRequest({ params: { runId: "run-a" }, query: { limit: "10" } }),
      res,
      createMockNext(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const payload = res.json.mock.calls[0]![0] as { data: Array<{ run_id: string }> };
    expect(payload.data.map((l) => l.run_id)).toEqual(["run-a", "run-a"]);
  });

  it("forwards errors to next", async () => {
    const { controller, client } = makeController();
    client.nextError = { code: "PGRST116", message: "boom" };
    const next = createMockNext();

    controller.getLogsByRunId(
      createMockRequest({ params: { runId: "run-a" } }),
      createMockResponse(),
      next,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]![0]).toBeInstanceOf(DatabaseError);
  });
});
