import { describe, expect, it } from "vitest";

import { ScraperHealthController } from "@/controllers/ScraperHealthController";
import { ValidationError } from "@/lib/errors";

import { scraperHealth } from "../../fixtures/scraper-health";
import {
  createMockNext,
  createMockRequest,
  createMockResponse,
  flushPromises,
} from "../../mocks/express";
import { createMockScraperHealthService } from "../../mocks/services";

function makeController() {
  const service = createMockScraperHealthService();
  const controller = new ScraperHealthController(service);
  return { service, controller };
}

describe("ScraperHealthController.getHealth", () => {
  it("delegates to getSummary and sends 200", async () => {
    const { service, controller } = makeController();
    const summary = {
      total: 4,
      healthy: 1,
      degraded: 1,
      failed: 1,
      unknown: 1,
      averageResponseTimeMs: 360,
      averageConsecutiveFailures: 1.75,
    };
    service.getSummary.mockResolvedValue(summary);
    const res = createMockResponse();

    controller.getHealth(createMockRequest(), res, createMockNext());
    await flushPromises();

    expect(service.getSummary).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Scraper health summary retrieved.",
      data: summary,
    });
  });
});

describe("ScraperHealthController.getHealthList", () => {
  it("delegates to listAll and sends 200 with the rows", async () => {
    const { service, controller } = makeController();
    service.listAll.mockResolvedValue(scraperHealth);
    const res = createMockResponse();

    controller.getHealthList(createMockRequest(), res, createMockNext());
    await flushPromises();

    expect(service.listAll).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Scraper health list retrieved.",
      data: scraperHealth,
    });
  });
});

describe("ScraperHealthController.getHealthByBank", () => {
  it("delegates with the bankCode param and sends 200", async () => {
    const { service, controller } = makeController();
    service.findByBankCode.mockResolvedValue(scraperHealth[0]!);
    const res = createMockResponse();

    controller.getHealthByBank(
      createMockRequest({ params: { bankCode: "ABY" } }),
      res,
      createMockNext(),
    );
    await flushPromises();

    expect(service.findByBankCode).toHaveBeenCalledWith("ABY");
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Scraper health retrieved.",
      data: scraperHealth[0],
    });
  });

  it("sends null data when a bank has no health row (not an error)", async () => {
    const { service, controller } = makeController();
    service.findByBankCode.mockResolvedValue(null);
    const res = createMockResponse();

    controller.getHealthByBank(
      createMockRequest({ params: { bankCode: "ZZZ" } }),
      res,
      createMockNext(),
    );
    await flushPromises();

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Scraper health retrieved.",
      data: null,
    });
  });

  it("forwards errors to next", async () => {
    const { service, controller } = makeController();
    const error = new ValidationError("bad");
    service.findByBankCode.mockRejectedValue(error);
    const next = createMockNext();

    controller.getHealthByBank(
      createMockRequest({ params: { bankCode: "X" } }),
      createMockResponse(),
      next,
    );
    await flushPromises();

    expect(next).toHaveBeenCalledWith(error);
  });
});
