import { describe, expect, it } from "vitest";

import { ExchangeRatesController } from "@/controllers/ExchangeRatesController";
import { NotFoundError } from "@/lib/errors";

import { exchangeRates } from "../../fixtures/exchange-rates";
import {
  createMockNext,
  createMockRequest,
  createMockResponse,
  flushPromises,
} from "../../mocks/express";
import { createMockExchangeRatesService } from "../../mocks/services";

function makeController() {
  const service = createMockExchangeRatesService();
  const controller = new ExchangeRatesController(service);
  return { service, controller };
}

describe("ExchangeRatesController.getLatestRates", () => {
  it("calls the service with an empty range and sends 200", async () => {
    const { service, controller } = makeController();
    service.getLatestRates.mockResolvedValue(exchangeRates);
    const res = createMockResponse();

    controller.getLatestRates(createMockRequest(), res, createMockNext());
    await flushPromises();

    expect(service.getLatestRates).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Latest exchange rates retrieved.",
      data: exchangeRates,
    });
  });

  it("reads from/to query params into the date range", async () => {
    const { service, controller } = makeController();
    service.getLatestRates.mockResolvedValue([]);

    controller.getLatestRates(
      createMockRequest({ query: { from: "2026-07-01", to: "2026-07-31" } }),
      createMockResponse(),
      createMockNext(),
    );
    await flushPromises();

    expect(service.getLatestRates).toHaveBeenCalledWith({
      from: "2026-07-01",
      to: "2026-07-31",
    });
  });
});

describe("ExchangeRatesController.getLatestRatesByBank", () => {
  it("delegates with the bankCode param and date range", async () => {
    const { service, controller } = makeController();
    service.getLatestRatesByBank.mockResolvedValue([]);

    controller.getLatestRatesByBank(
      createMockRequest({ params: { bankCode: "ABY" }, query: { from: "2026-08-01" } }),
      createMockResponse(),
      createMockNext(),
    );
    await flushPromises();

    expect(service.getLatestRatesByBank).toHaveBeenCalledWith("ABY", { from: "2026-08-01" });
  });
});

describe("ExchangeRatesController.getLatestRateByBankAndCurrency", () => {
  it("delegates with both params and sends 200", async () => {
    const { service, controller } = makeController();
    service.getLatestRateByBankAndCurrency.mockResolvedValue(exchangeRates[0]!);
    const res = createMockResponse();

    controller.getLatestRateByBankAndCurrency(
      createMockRequest({ params: { bankCode: "ABY", currencyCode: "USD" } }),
      res,
      createMockNext(),
    );
    await flushPromises();

    expect(service.getLatestRateByBankAndCurrency).toHaveBeenCalledWith("ABY", "USD");
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Latest rate retrieved.",
      data: exchangeRates[0],
    });
  });
});

describe("ExchangeRatesController.getMarketTicker", () => {
  it("delegates without a limit and sends 200", async () => {
    const { service, controller } = makeController();
    service.getMarketTicker.mockResolvedValue([{ pair: "USD/ETB", value: 120.5, change: 0.42 }]);
    const res = createMockResponse();

    controller.getMarketTicker(createMockRequest(), res, createMockNext());
    await flushPromises();

    expect(service.getMarketTicker).toHaveBeenCalledWith(undefined);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Market ticker retrieved.",
      data: [{ pair: "USD/ETB", value: 120.5, change: 0.42 }],
    });
  });

  it("reads the optional limit query param", async () => {
    const { service, controller } = makeController();
    service.getMarketTicker.mockResolvedValue([]);

    controller.getMarketTicker(
      createMockRequest({ query: { limit: "3" } }),
      createMockResponse(),
      createMockNext(),
    );
    await flushPromises();

    expect(service.getMarketTicker).toHaveBeenCalledWith(3);
  });
});

describe("ExchangeRatesController.getHistoricalRates", () => {
  it("delegates with params and range", async () => {
    const { service, controller } = makeController();
    service.getHistoricalRates.mockResolvedValue([]);

    controller.getHistoricalRates(
      createMockRequest({
        params: { bankCode: "ABY", currencyCode: "USD" },
        query: { from: "2026-07-01", to: "2026-08-31" },
      }),
      createMockResponse(),
      createMockNext(),
    );
    await flushPromises();

    expect(service.getHistoricalRates).toHaveBeenCalledWith("ABY", "USD", {
      from: "2026-07-01",
      to: "2026-08-31",
    });
  });

  it("forwards errors to next", async () => {
    const { service, controller } = makeController();
    const error = new NotFoundError('Bank "NOPE" not found.');
    service.getHistoricalRates.mockRejectedValue(error);
    const next = createMockNext();

    controller.getHistoricalRates(
      createMockRequest({ params: { bankCode: "NOPE", currencyCode: "USD" } }),
      createMockResponse(),
      next,
    );
    await flushPromises();

    expect(next).toHaveBeenCalledWith(error);
  });
});
