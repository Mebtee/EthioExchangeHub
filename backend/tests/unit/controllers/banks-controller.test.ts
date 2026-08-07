import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { BanksController } from "@/controllers/BanksController";
import { BanksRepository } from "@/repositories/BanksRepository";
import { BanksServiceImpl } from "@/services/BanksService";
import type { Database } from "@/types/database";

import { banks } from "../../fixtures/banks";
import { createMockNext, createMockRequest, createMockResponse } from "../../helpers/http";
import { createFakeSupabaseClient } from "../../helpers/supabase-client";

/** Builds the real controller wired to the real service + repository over a seeded client. */
function makeController() {
  const client = createFakeSupabaseClient({ banks: [...banks] });
  const service = new BanksServiceImpl(
    new BanksRepository(client as unknown as SupabaseClient<Database>),
  );
  const controller = new BanksController(service);
  return { service, controller };
}

describe("BanksController.getBanks", () => {
  it("lists banks with an empty filter and sends the success envelope", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getBanks(createMockRequest(), res, createMockNext());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Banks retrieved.",
      data: expect.any(Array),
    });
    const payload = (res.json.mock.calls[0]![0] as { data: Array<{ bank_code: string }> }).data;
    expect(payload.map((b) => b.bank_code)).toEqual(["ABY", "CBE", "DASH"]);
  });

  it("passes activeOnly=true to the service", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getBanks(
      createMockRequest({ query: { activeOnly: "true" } }),
      res,
      createMockNext(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const payload = (res.json.mock.calls[0]![0] as { data: Array<{ bank_code: string }> }).data;
    expect(payload.map((b) => b.bank_code)).toEqual(["ABY", "CBE"]);
  });

  it("passes bankType to the service", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getBanks(
      createMockRequest({ query: { activeOnly: "true", bankType: "state_owned" } }),
      res,
      createMockNext(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const payload = (res.json.mock.calls[0]![0] as { data: Array<{ bank_code: string }> }).data;
    expect(payload.map((b) => b.bank_code)).toEqual(["CBE"]);
  });
});

describe("BanksController.getActiveBanks", () => {
  it("delegates to listActiveBanks and sends 200", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getActiveBanks(createMockRequest(), res, createMockNext());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Active banks retrieved.",
      data: expect.any(Array),
    });
    const payload = (res.json.mock.calls[0]![0] as { data: Array<{ bank_code: string }> }).data;
    expect(payload.map((b) => b.bank_code)).toEqual(["ABY", "CBE"]);
  });
});

describe("BanksController.getBankByCode", () => {
  it("reads the bankCode param and delegates", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getBankByCode(
      createMockRequest({ params: { bankCode: "ABY" } }),
      res,
      createMockNext(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Bank retrieved.",
      data: expect.objectContaining({ bank_code: "ABY", bank_name: "Awash Bank" }),
    });
  });

  it("forwards service errors to next without writing a response", async () => {
    const { controller } = makeController();
    const res = createMockResponse();
    const next = createMockNext();

    controller.getBankByCode(createMockRequest({ params: { bankCode: "NOPE" } }), res, next);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
