import { describe, expect, it } from "vitest";

import { AdminController } from "@/controllers/AdminController";
import { ValidationError } from "@/lib/errors";

import {
  createMockNext,
  createMockRequest,
  createMockResponse,
  flushPromises,
} from "../../mocks/express";
import { createMockExchangeRatesService, createMockSettingsService } from "../../mocks/services";

function makeController() {
  const settingsService = createMockSettingsService();
  const exchangeRatesService = createMockExchangeRatesService();
  const controller = new AdminController(settingsService, exchangeRatesService);
  return { settingsService, exchangeRatesService, controller };
}

describe("AdminController.getProfile", () => {
  it("delegates to the settings service and sends 200", async () => {
    const { settingsService, controller } = makeController();
    const profile = {
      name: "Root Admin",
      email: "root@example.com",
      role: "Administrator",
      initials: "RA",
      memberSince: "2026-01-01",
      lastLogin: "2026-08-01T08:00:00.000Z",
    };
    settingsService.getProfile.mockResolvedValue(profile);
    const res = createMockResponse();

    controller.getProfile(createMockRequest(), res, createMockNext());
    await flushPromises();

    expect(settingsService.getProfile).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Admin profile retrieved.",
      data: profile,
    });
  });
});

describe("AdminController.updateProfile", () => {
  it("passes the validated body to the service and sends 200", async () => {
    const { settingsService, controller } = makeController();
    settingsService.updateProfile.mockResolvedValue({ name: "Jane" });
    const res = createMockResponse();

    controller.updateProfile(
      createMockRequest({ body: { name: "Jane Doe" } }),
      res,
      createMockNext(),
    );
    await flushPromises();

    expect(settingsService.updateProfile).toHaveBeenCalledWith({ name: "Jane Doe" });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Admin profile updated.",
      data: { name: "Jane" },
    });
  });
});

describe("AdminController.getSettings", () => {
  it("delegates to the settings service and sends 200", async () => {
    const { settingsService, controller } = makeController();
    settingsService.getSettings.mockResolvedValue({ siteName: "Ethio Exchange Hub" });
    const res = createMockResponse();

    controller.getSettings(createMockRequest(), res, createMockNext());
    await flushPromises();

    expect(settingsService.getSettings).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Admin settings retrieved.",
      data: { siteName: "Ethio Exchange Hub" },
    });
  });
});

describe("AdminController.updateSettings", () => {
  it("passes the validated body to the service and sends 200", async () => {
    const { settingsService, controller } = makeController();
    settingsService.updateSettings.mockResolvedValue({ emailAlerts: false });
    const res = createMockResponse();

    controller.updateSettings(
      createMockRequest({ body: { emailAlerts: false } }),
      res,
      createMockNext(),
    );
    await flushPromises();

    expect(settingsService.updateSettings).toHaveBeenCalledWith({ emailAlerts: false });
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Admin settings updated.",
      data: { emailAlerts: false },
    });
  });
});

describe("AdminController.getRateTrend", () => {
  it("delegates without days when the query omits it", async () => {
    const { exchangeRatesService, controller } = makeController();
    exchangeRatesService.getRateTrend.mockResolvedValue([]);
    const res = createMockResponse();

    controller.getRateTrend(createMockRequest(), res, createMockNext());
    await flushPromises();

    expect(exchangeRatesService.getRateTrend).toHaveBeenCalledWith(undefined, undefined);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Rate trend retrieved.",
      data: [],
    });
  });

  it("coerces a valid days query param", async () => {
    const { exchangeRatesService, controller } = makeController();
    exchangeRatesService.getRateTrend.mockResolvedValue([]);

    controller.getRateTrend(
      createMockRequest({ query: { days: "7" } }),
      createMockResponse(),
      createMockNext(),
    );
    await flushPromises();

    expect(exchangeRatesService.getRateTrend).toHaveBeenCalledWith(7, undefined);
  });

  it("passes the currency query param through", async () => {
    const { exchangeRatesService, controller } = makeController();
    exchangeRatesService.getRateTrend.mockResolvedValue([]);

    controller.getRateTrend(
      createMockRequest({ query: { currency: "USD", days: "7" } }),
      createMockResponse(),
      createMockNext(),
    );
    await flushPromises();

    expect(exchangeRatesService.getRateTrend).toHaveBeenCalledWith(7, "USD");
  });

  it("forwards errors to next", async () => {
    const { exchangeRatesService, controller } = makeController();
    const error = new ValidationError("bad");
    exchangeRatesService.getRateTrend.mockRejectedValue(error);
    const next = createMockNext();

    controller.getRateTrend(createMockRequest(), createMockResponse(), next);
    await flushPromises();

    expect(next).toHaveBeenCalledWith(error);
  });
});
