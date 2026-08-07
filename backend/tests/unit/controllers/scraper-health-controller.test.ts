import { describe, expect, it } from "vitest";

import { ScraperHealthController } from "@/controllers/ScraperHealthController";
import { DatabaseError } from "@/lib/errors";
import { ScrapeLogsRepository } from "@/repositories/ScrapeLogsRepository";
import { ScraperHealthServiceImpl } from "@/services/ScraperHealthService";

import { scrapeLogs } from "../../fixtures/scrape-logs";
import { createMockNext, createMockRequest, createMockResponse } from "../../helpers/http";
import { createFakeSupabaseClient } from "../../helpers/supabase-client";

/** Builds the real controller over the real service + repository on a seeded client. */
function makeController() {
  const client = createFakeSupabaseClient({ scrape_logs: [...scrapeLogs] });
  const service = new ScraperHealthServiceImpl(
    new ScrapeLogsRepository(client as unknown as never),
    7,
    () => "2026-08-05",
  );
  const controller = new ScraperHealthController(service);
  return { service, controller, client };
}

describe("ScraperHealthController.getHealth", () => {
  it("delegates to getSummary and sends 200", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getHealth(createMockRequest(), res, createMockNext());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Scraper health summary retrieved.",
      data: expect.objectContaining({
        total: 3,
        healthy: 2,
        degraded: 0,
        failed: 1,
        unknown: 0,
        averageResponseTimeMs: 8320 / 3,
        averageConsecutiveFailures: 1 / 3,
      }),
    });
  });
});

describe("ScraperHealthController.getHealthList", () => {
  it("delegates to listAll and sends 200 with the rows", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getHealthList(createMockRequest(), res, createMockNext());
    await new Promise((resolve) => setTimeout(resolve, 0));

    const payload = res.json.mock.calls[0]![0] as { data: Array<{ bank_code: string }> };
    expect(payload).toMatchObject({ success: true, message: "Scraper health list retrieved." });
    expect(payload.data.map((r) => r.bank_code)).toEqual(["ABY", "CBE", "DASH"]);
  });
});

describe("ScraperHealthController.getHealthByBank", () => {
  it("delegates with the bankCode param and sends 200", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getHealthByBank(
      createMockRequest({ params: { bankCode: "ABY" } }),
      res,
      createMockNext(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Scraper health retrieved.",
      data: expect.objectContaining({ bank_code: "ABY", status: "healthy" }),
    });
  });

  it("sends null data when a bank has no logs (not an error)", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getHealthByBank(
      createMockRequest({ params: { bankCode: "NOPE" } }),
      res,
      createMockNext(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Scraper health retrieved.",
      data: null,
    });
  });

  it("forwards errors to next", async () => {
    const { controller, client } = makeController();
    client.nextError = { code: "PGRST116", message: "boom" };
    const next = createMockNext();

    controller.getHealthByBank(
      createMockRequest({ params: { bankCode: "X" } }),
      createMockResponse(),
      next,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]![0]).toBeInstanceOf(DatabaseError);
  });
});
