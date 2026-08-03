import { describe, expect, it } from "vitest";

import { BanksController } from "@/controllers/BanksController";
import { NotFoundError } from "@/lib/errors";

import { banks } from "../../fixtures/banks";
import {
  createMockNext,
  createMockRequest,
  createMockResponse,
  flushPromises,
} from "../../mocks/express";
import { createMockBanksService } from "../../mocks/services";

function makeController() {
  const service = createMockBanksService();
  const controller = new BanksController(service);
  return { service, controller };
}

describe("BanksController.getBanks", () => {
  it("lists banks with an empty filter and sends the success envelope", async () => {
    const { service, controller } = makeController();
    service.listBanks.mockResolvedValue(banks);
    const res = createMockResponse();

    controller.getBanks(createMockRequest(), res, createMockNext());
    await flushPromises();

    expect(service.listBanks).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Banks retrieved.",
      data: banks,
    });
  });

  it("passes activeOnly=true to the service", async () => {
    const { service, controller } = makeController();
    service.listBanks.mockResolvedValue([]);

    controller.getBanks(
      createMockRequest({ query: { activeOnly: "true" } }),
      createMockResponse(),
      createMockNext(),
    );
    await flushPromises();

    expect(service.listBanks).toHaveBeenCalledWith({ activeOnly: true });
  });

  it("passes bankType to the service", async () => {
    const { service, controller } = makeController();
    service.listBanks.mockResolvedValue([]);

    controller.getBanks(
      createMockRequest({ query: { activeOnly: "true", bankType: "state_owned" } }),
      createMockResponse(),
      createMockNext(),
    );
    await flushPromises();

    expect(service.listBanks).toHaveBeenCalledWith({
      activeOnly: true,
      bankType: "state_owned",
    });
  });
});

describe("BanksController.getActiveBanks", () => {
  it("delegates to listActiveBanks and sends 200", async () => {
    const { service, controller } = makeController();
    service.listActiveBanks.mockResolvedValue(banks);
    const res = createMockResponse();

    controller.getActiveBanks(createMockRequest(), res, createMockNext());
    await flushPromises();

    expect(service.listActiveBanks).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Active banks retrieved.",
      data: banks,
    });
  });
});

describe("BanksController.getBankByCode", () => {
  it("reads the bankCode param and delegates", async () => {
    const { service, controller } = makeController();
    service.findByBankCode.mockResolvedValue(banks[0]!);
    const res = createMockResponse();

    controller.getBankByCode(
      createMockRequest({ params: { bankCode: "ABY" } }),
      res,
      createMockNext(),
    );
    await flushPromises();

    expect(service.findByBankCode).toHaveBeenCalledWith("ABY");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Bank retrieved.",
      data: banks[0],
    });
  });

  it("forwards service errors to next without writing a response", async () => {
    const { service, controller } = makeController();
    const error = new NotFoundError('Bank "NOPE" not found.');
    service.findByBankCode.mockRejectedValue(error);
    const res = createMockResponse();
    const next = createMockNext();

    controller.getBankByCode(createMockRequest({ params: { bankCode: "NOPE" } }), res, next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
