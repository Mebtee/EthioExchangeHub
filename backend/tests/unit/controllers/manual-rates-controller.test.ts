import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { ManualRatesController } from "@/controllers/ManualRatesController";
import { BanksRepository } from "@/repositories/BanksRepository";
import { ManualRatesRepository } from "@/repositories/ManualRatesRepository";
import { BanksServiceImpl } from "@/services/BanksService";
import { ManualRatesServiceImpl } from "@/services/ManualRatesService";
import type { Database } from "@/types/database";

import { banks } from "../../fixtures/banks";
import { manualRates } from "../../fixtures/manual-rates";
import { createMockNext, createMockRequest, createMockResponse } from "../../helpers/http";
import { createFakeSupabaseClient } from "../../helpers/supabase-client";

/** Builds the real controller over real services + repositories on a seeded client. */
function makeController() {
  const client = createFakeSupabaseClient({ manual_rates: [...manualRates], banks: [...banks] });
  const banksService = new BanksServiceImpl(
    new BanksRepository(client as unknown as SupabaseClient<Database>),
  );
  const service = new ManualRatesServiceImpl(
    new ManualRatesRepository(client as unknown as SupabaseClient<Database>),
    banksService,
  );
  const controller = new ManualRatesController(service);
  return { service, controller };
}

describe("ManualRatesController.getManualRates", () => {
  it("reads filter query params into the filter", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getManualRates(
      createMockRequest({ query: { bankCode: "ABY" } }),
      res,
      createMockNext(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const payload = res.json.mock.calls[0]![0] as { data: Array<{ bank_code: string }> };
    expect(payload.data.map((r) => r.bank_code)).toEqual(["ABY"]);
  });

  it("sends the success envelope", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getManualRates(createMockRequest(), res, createMockNext());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0]![0] as { data: Array<{ rate_date: string }> };
    expect(payload).toMatchObject({ success: true, message: "Manual rates retrieved." });
    // Newest first.
    expect(payload.data.map((r) => r.rate_date)).toEqual(["2026-08-02", "2026-08-01"]);
  });
});

describe("ManualRatesController.createManualRate", () => {
  it("passes the body through and responds 201", async () => {
    const { controller } = makeController();
    const body = {
      bank_code: "CBE",
      currency_code: "GBP",
      buying_rate: 132,
      selling_rate: 133,
      rate_date: "2026-08-03",
    };
    const res = createMockResponse();

    controller.createManualRate(createMockRequest({ body }), res, createMockNext());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0]![0] as { data: { id: string; bank_code: string } };
    expect(payload).toMatchObject({ success: true, message: "Manual rate created." });
    expect(payload.data.id).toBeTypeOf("string");
    expect(payload.data.bank_code).toBe("CBE");
  });

  it("forwards business errors to next", async () => {
    const { controller } = makeController();
    const next = createMockNext();
    const body = {
      bank_code: "ABY",
      currency_code: "USD",
      buying_rate: 121.4,
      selling_rate: 122.2,
      rate_date: "2026-08-02", // already occupied by manual-1
    };

    controller.createManualRate(createMockRequest({ body }), createMockResponse(), next);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("ManualRatesController.updateManualRate", () => {
  it("passes id + body through and responds 200", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.updateManualRate(
      createMockRequest({ params: { id: "manual-1" }, body: { selling_rate: 123 } }),
      res,
      createMockNext(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Manual rate updated.",
      data: expect.objectContaining({ id: "manual-1", selling_rate: 123 }),
    });
  });
});

describe("ManualRatesController.deleteManualRate", () => {
  it("passes the id through and responds 200 with null data", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.deleteManualRate(
      createMockRequest({ params: { id: "manual-1" } }),
      res,
      createMockNext(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Manual rate deleted.",
      data: null,
    });
  });
});
