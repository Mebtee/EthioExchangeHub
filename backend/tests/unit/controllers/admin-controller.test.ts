import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { AdminController } from "@/controllers/AdminController";
import { toAuthenticatedUser } from "@/lib/auth-user";
import { BanksRepository } from "@/repositories/BanksRepository";
import { ExchangeRatesRepository } from "@/repositories/ExchangeRatesRepository";
import { ManualRatesRepository } from "@/repositories/ManualRatesRepository";
import { SettingsRepository } from "@/repositories/SettingsRepository";
import { UsersRepository } from "@/repositories/UsersRepository";
import { BanksServiceImpl } from "@/services/BanksService";
import { ExchangeRatesServiceImpl } from "@/services/ExchangeRatesService";
import { SettingsServiceImpl } from "@/services/SettingsService";
import type { Database, ExchangeRateRow, SettingRow } from "@/types/database";

import { banks } from "../../fixtures/banks";
import { exchangeRates } from "../../fixtures/exchange-rates";
import { settings } from "../../fixtures/settings";
import { users } from "../../fixtures/users";
import { createMockNext, createMockRequest, createMockResponse } from "../../helpers/http";
import { createFakeSupabaseClient } from "../../helpers/supabase-client";

/** Builds the real controller over real services + repositories on a seeded client. */
function makeController(
  seedSettings: SettingRow[] = settings,
  seedRates: ExchangeRateRow[] = exchangeRates,
) {
  const client = createFakeSupabaseClient({
    settings: [...seedSettings],
    exchange_rates: [...seedRates],
    manual_rates: [],
    banks: [...banks],
    users: [...users],
  });
  const settingsService = new SettingsServiceImpl(
    new SettingsRepository(client as unknown as SupabaseClient<Database>),
    new UsersRepository(client as unknown as SupabaseClient<Database>),
  );
  const banksService = new BanksServiceImpl(
    new BanksRepository(client as unknown as SupabaseClient<Database>),
  );
  const exchangeRatesService = new ExchangeRatesServiceImpl(
    new ExchangeRatesRepository(client as unknown as SupabaseClient<Database>),
    banksService,
    new ManualRatesRepository(client as unknown as SupabaseClient<Database>),
    7,
    () => "2026-08-05",
  );
  const controller = new AdminController(settingsService, exchangeRatesService);
  return { settingsService, exchangeRatesService, controller, client };
}

/** A request carrying the authenticated operator (the seeded `users` row). */
function adminRequest(overrides: Parameters<typeof createMockRequest>[0] = {}) {
  return createMockRequest({ user: toAuthenticatedUser(users[0]), ...overrides });
}

describe("AdminController.getProfile", () => {
  it("delegates to the settings service with the authenticated user and sends 200", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getProfile(adminRequest(), res, createMockNext());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Admin profile retrieved.",
      data: expect.objectContaining({ name: "Operator", initials: "OP" }),
    });
  });
});

describe("AdminController.updateProfile", () => {
  it("passes the validated body to the service and sends 200", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.updateProfile(adminRequest({ body: { name: "Jane Doe" } }), res, createMockNext());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Admin profile updated.",
      data: expect.objectContaining({ name: "Jane Doe", initials: "JD" }),
    });
  });
});

describe("AdminController.getSettings", () => {
  it("delegates to the settings service and sends 200", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getSettings(createMockRequest(), res, createMockNext());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Admin settings retrieved.",
      data: expect.objectContaining({ siteName: "Ethio Exchange Hub" }),
    });
  });
});

describe("AdminController.updateSettings", () => {
  it("passes the validated body to the service and sends 200", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.updateSettings(
      createMockRequest({ body: { emailAlerts: false } }),
      res,
      createMockNext(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Admin settings updated.",
      data: expect.objectContaining({ emailAlerts: false }),
    });
  });
});

describe("AdminController.getRateTrend", () => {
  it("delegates without days when the query omits it", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getRateTrend(createMockRequest(), res, createMockNext());
    await new Promise((resolve) => setTimeout(resolve, 0));

    const payload = res.json.mock.calls[0]![0] as { data: Array<{ label: string }> };
    expect(payload).toMatchObject({ success: true, message: "Rate trend retrieved." });
    expect(payload.data.map((p) => p.label)).toEqual(["2026-07-30", "2026-08-01"]);
  });

  it("coerces a valid days query param", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getRateTrend(createMockRequest({ query: { days: "1" } }), res, createMockNext());
    await new Promise((resolve) => setTimeout(resolve, 0));

    const payload = res.json.mock.calls[0]![0] as { data: Array<{ label: string }> };
    expect(payload.data.map((p) => p.label)).toEqual(["2026-08-01"]);
  });

  it("passes the currency query param through", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.getRateTrend(
      createMockRequest({ query: { currency: "USD" } }),
      res,
      createMockNext(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const payload = res.json.mock.calls[0]![0] as { data: Array<{ cashBuying: number }> };
    // 2026-08-01 USD-only mean = (121.5+119.5)/2 = 120.5.
    expect(payload.data[1]).toMatchObject({ cashBuying: 120.5 });
  });

  it("forwards errors to next", async () => {
    const { controller } = makeController();
    const next = createMockNext();

    controller.getRateTrend(
      createMockRequest({ query: { currency: "usd" } }),
      createMockResponse(),
      next,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(next).toHaveBeenCalledTimes(1);
  });
});
