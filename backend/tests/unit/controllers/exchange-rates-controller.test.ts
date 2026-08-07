import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { ExchangeRatesController } from "@/controllers/ExchangeRatesController";
import { BanksRepository } from "@/repositories/BanksRepository";
import { ExchangeRatesRepository } from "@/repositories/ExchangeRatesRepository";
import { ManualRatesRepository } from "@/repositories/ManualRatesRepository";
import { BanksServiceImpl } from "@/services/BanksService";
import { ExchangeRatesServiceImpl } from "@/services/ExchangeRatesService";
import type { Database } from "@/types/database";

import { banks } from "../../fixtures/banks";
import { exchangeRates } from "../../fixtures/exchange-rates";
import { createMockNext, createMockRequest, createMockResponse } from "../../helpers/http";
import { createFakeSupabaseClient } from "../../helpers/supabase-client";

/** Builds the real controller over real services + repositories on a seeded client. */
function makeController() {
  const client = createFakeSupabaseClient({
    exchange_rates: [...exchangeRates],
    manual_rates: [],
    banks: [...banks],
  });
  const banksService = new BanksServiceImpl(
    new BanksRepository(client as unknown as SupabaseClient<Database>),
  );
  const service = new ExchangeRatesServiceImpl(
    new ExchangeRatesRepository(client as unknown as SupabaseClient<Database>),
    banksService,
    new ManualRatesRepository(client as unknown as SupabaseClient<Database>),
    7,
    () => "2026-08-05",
  );
  const controller = new ExchangeRatesController(service);
  return { service, controller };
}

describe("ExchangeRatesController.getLatestRates", () => {
  it("calls the service with an empty range and sends 200", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getLatestRates(createMockRequest(), res, createMockNext());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0]![0] as { data: Array<{ bank_code: string }> };
    expect(payload).toMatchObject({ success: true, message: "Latest exchange rates retrieved." });
    expect(payload.data).toHaveLength(3); // ABY/USD, CBE/USD, ABY/EUR
  });

  it("reads from/to query params into the date range", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getLatestRates(
      createMockRequest({ query: { from: "2026-08-01", to: "2026-08-31" } }),
      res,
      createMockNext(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const payload = res.json.mock.calls[0]![0] as { data: Array<{ rate_date: string }> };
    expect(payload.data.every((r) => r.rate_date >= "2026-08-01")).toBe(true);
  });
});

describe("ExchangeRatesController.getLatestRatesByBank", () => {
  it("delegates with the bankCode param and date range", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getLatestRatesByBank(
      createMockRequest({ params: { bankCode: "ABY" }, query: { from: "2026-08-01" } }),
      res,
      createMockNext(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const payload = res.json.mock.calls[0]![0] as { data: Array<{ currency_code: string }> };
    expect(payload.data.map((r) => r.currency_code)).toEqual(["EUR", "USD"]);
  });
});

describe("ExchangeRatesController.getLatestRateByBankAndCurrency", () => {
  it("delegates with both params and sends 200", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getLatestRateByBankAndCurrency(
      createMockRequest({ params: { bankCode: "ABY", currencyCode: "USD" } }),
      res,
      createMockNext(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Latest rate retrieved.",
      data: expect.objectContaining({ bank_code: "ABY", currency_code: "USD", buying_rate: 121.5 }),
    });
  });
});

describe("ExchangeRatesController.getMarketTicker", () => {
  it("delegates without a limit and sends 200", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getMarketTicker(createMockRequest(), res, createMockNext());
    await new Promise((resolve) => setTimeout(resolve, 0));

    const payload = res.json.mock.calls[0]![0] as { data: Array<{ pair: string }> };
    expect(payload).toMatchObject({ success: true, message: "Market ticker retrieved." });
    expect(payload.data).toEqual([
      { pair: "EUR/ETB", value: 140, change: 0 },
      { pair: "USD/ETB", value: 120.5, change: 0.42 },
    ]);
  });

  it("reads the optional limit query param", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getMarketTicker(createMockRequest({ query: { limit: "1" } }), res, createMockNext());
    await new Promise((resolve) => setTimeout(resolve, 0));

    const payload = res.json.mock.calls[0]![0] as { data: Array<{ pair: string }> };
    expect(payload.data).toHaveLength(1);
  });
});

describe("ExchangeRatesController.getDateRange", () => {
  it("delegates to the service and sends 200 with the bounds", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getDateRange(createMockRequest(), res, createMockNext());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Rate date range retrieved.",
      data: { min: "2026-07-30", max: "2026-08-01" },
    });
  });
});

describe("ExchangeRatesController.getHistoricalRates", () => {
  it("delegates with params and range", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getHistoricalRates(
      createMockRequest({
        params: { bankCode: "ABY", currencyCode: "USD" },
        query: { from: "2026-07-01", to: "2026-08-31" },
      }),
      res,
      createMockNext(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const payload = res.json.mock.calls[0]![0] as { data: Array<{ rate_date: string }> };
    expect(payload.data.map((r) => r.rate_date)).toEqual(["2026-07-30", "2026-08-01"]);
  });

  it("forwards errors to next", async () => {
    const { controller } = makeController();
    const next = createMockNext();

    controller.getHistoricalRates(
      createMockRequest({ params: { bankCode: "NOPE", currencyCode: "USD" } }),
      createMockResponse(),
      next,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(next).toHaveBeenCalledTimes(1);
  });
});
