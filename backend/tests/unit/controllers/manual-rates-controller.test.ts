import { describe, expect, it } from "vitest";

import { ManualRatesController } from "@/controllers/ManualRatesController";
import { ConflictError } from "@/lib/errors";

import { manualRates } from "../../fixtures/manual-rates";
import {
  createMockNext,
  createMockRequest,
  createMockResponse,
  flushPromises,
} from "../../mocks/express";
import { createMockManualRatesService } from "../../mocks/services";

function makeController() {
  const service = createMockManualRatesService();
  const controller = new ManualRatesController(service);
  return { service, controller };
}

describe("ManualRatesController.getManualRates", () => {
  it("reads filter query params into the filter", async () => {
    const { service, controller } = makeController();
    service.listManualRates.mockResolvedValue(manualRates);

    controller.getManualRates(
      createMockRequest({
        query: { bankCode: "ABY", currencyCode: "USD", rateDate: "2026-08-02" },
      }),
      createMockResponse(),
      createMockNext(),
    );
    await flushPromises();

    expect(service.listManualRates).toHaveBeenCalledWith({
      bankCode: "ABY",
      currencyCode: "USD",
      rateDate: "2026-08-02",
    });
  });

  it("sends the success envelope", async () => {
    const { service, controller } = makeController();
    service.listManualRates.mockResolvedValue(manualRates);
    const res = createMockResponse();

    controller.getManualRates(createMockRequest(), res, createMockNext());
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Manual rates retrieved.",
      data: manualRates,
    });
  });
});

describe("ManualRatesController.createManualRate", () => {
  it("passes the body through and responds 201", async () => {
    const { service, controller } = makeController();
    const body = {
      bank_code: "ABY",
      currency_code: "USD",
      buying_rate: 121.4,
      selling_rate: 122.2,
      rate_date: "2026-08-02",
    };
    service.createManualRate.mockResolvedValue(manualRates[0]!);
    const res = createMockResponse();

    controller.createManualRate(createMockRequest({ body }), res, createMockNext());
    await flushPromises();

    expect(service.createManualRate).toHaveBeenCalledWith(body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Manual rate created.",
      data: manualRates[0],
    });
  });

  it("forwards business errors to next", async () => {
    const { service, controller } = makeController();
    const error = new ConflictError("duplicate");
    service.createManualRate.mockRejectedValue(error);
    const next = createMockNext();

    controller.createManualRate(createMockRequest({ body: {} }), createMockResponse(), next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe("ManualRatesController.updateManualRate", () => {
  it("passes id + body through and responds 200", async () => {
    const { service, controller } = makeController();
    service.updateManualRate.mockResolvedValue({ ...manualRates[0]!, selling_rate: 123 });
    const res = createMockResponse();

    controller.updateManualRate(
      createMockRequest({ params: { id: "manual-1" }, body: { selling_rate: 123 } }),
      res,
      createMockNext(),
    );
    await flushPromises();

    expect(service.updateManualRate).toHaveBeenCalledWith("manual-1", { selling_rate: 123 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Manual rate updated.",
      data: { ...manualRates[0]!, selling_rate: 123 },
    });
  });
});

describe("ManualRatesController.deleteManualRate", () => {
  it("passes the id through and responds 200 with null data", async () => {
    const { service, controller } = makeController();
    service.deleteManualRate.mockResolvedValue(undefined);
    const res = createMockResponse();

    controller.deleteManualRate(
      createMockRequest({ params: { id: "manual-1" } }),
      res,
      createMockNext(),
    );
    await flushPromises();

    expect(service.deleteManualRate).toHaveBeenCalledWith("manual-1");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Manual rate deleted.",
      data: null,
    });
  });
});
