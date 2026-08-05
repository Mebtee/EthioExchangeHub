import { describe, expect, it } from "vitest";

import { adminProfileDefaults, adminSettingsDefaults } from "@/config/admin";
import { SettingsServiceImpl } from "@/services/SettingsService";

import { settings } from "../../fixtures/settings";
import { createMockSettingsRepository } from "../../mocks/repositories";

function makeService() {
  const repository = createMockSettingsRepository();
  const service = new SettingsServiceImpl(repository);
  return { service, repository };
}

describe("SettingsServiceImpl.getProfile", () => {
  it("returns the configured defaults when nothing is persisted", async () => {
    const { service, repository } = makeService();
    repository.findAllSettings.mockResolvedValue([]);

    const profile = await service.getProfile();
    expect(profile.name).toBe(adminProfileDefaults.name);
    expect(profile.email).toBe(adminProfileDefaults.email);
    expect(profile.role).toBe(adminProfileDefaults.role);
    expect(profile.initials).toBe("AD");
  });

  it("prefers persisted values and derives initials from the stored name", async () => {
    const { service, repository } = makeService();
    repository.findAllSettings.mockResolvedValue(settings);

    const profile = await service.getProfile();
    expect(profile.name).toBe("Root Admin");
    expect(profile.initials).toBe("RA");
    expect(profile.email).toBe(adminProfileDefaults.email);
    expect(profile.role).toBe(adminProfileDefaults.role);
  });
});

describe("SettingsServiceImpl.updateProfile", () => {
  it("persists only the provided fields and re-reads the merged profile", async () => {
    const { service, repository } = makeService();
    // The service re-reads after persisting, so the repo returns the stored rows.
    repository.findAllSettings.mockResolvedValue([
      { key: "admin_name", value: "Jane Doe", updated_at: null },
      { key: "admin_email", value: "jane@example.com", updated_at: null },
    ]);
    repository.upsertMany.mockResolvedValue([]);

    const profile = await service.updateProfile({ name: "Jane Doe", email: "jane@example.com" });
    expect(repository.upsertMany).toHaveBeenCalledWith([
      { key: "admin_name", value: "Jane Doe" },
      { key: "admin_email", value: "jane@example.com" },
    ]);
    expect(profile.name).toBe("Jane Doe");
    expect(profile.initials).toBe("JD");
  });

  it("skips the write when nothing is provided", async () => {
    const { service, repository } = makeService();
    repository.findAllSettings.mockResolvedValue([]);

    await service.updateProfile({});
    expect(repository.upsertMany).not.toHaveBeenCalled();
  });
});

describe("SettingsServiceImpl.getSettings", () => {
  it("merges persisted values over the configured defaults", async () => {
    const { service, repository } = makeService();
    repository.findAllSettings.mockResolvedValue(settings);

    const result = await service.getSettings();
    expect(result.siteName).toBe("Ethio Exchange Hub");
    expect(result.defaultCurrency).toBe("USD");
    expect(result.emailAlerts).toBe(true);
    expect(result.failureAlerts).toBe(adminSettingsDefaults.failureAlerts);
    expect(result.weeklyReport).toBe(adminSettingsDefaults.weeklyReport);
    expect(result.timezone).toBe(adminSettingsDefaults.timezone);
  });

  it("returns all configured defaults for an empty table", async () => {
    const { service, repository } = makeService();
    repository.findAllSettings.mockResolvedValue([]);

    const result = await service.getSettings();
    expect(result).toEqual({ ...adminSettingsDefaults });
  });
});

describe("SettingsServiceImpl.updateSettings", () => {
  it("serializes booleans and persists the given fields, then re-reads", async () => {
    const { service, repository } = makeService();
    // The service re-reads after persisting, so the repo returns the stored rows.
    repository.findAllSettings.mockResolvedValue([
      { key: "site_name", value: "New Hub", updated_at: null },
      { key: "email_alerts", value: "false", updated_at: null },
      { key: "failure_alerts", value: "true", updated_at: null },
      { key: "weekly_report", value: "true", updated_at: null },
    ]);
    repository.upsertMany.mockResolvedValue([]);

    const result = await service.updateSettings({
      siteName: "New Hub",
      emailAlerts: false,
      weeklyReport: true,
    });
    expect(repository.upsertMany).toHaveBeenCalledWith([
      { key: "site_name", value: "New Hub" },
      { key: "email_alerts", value: "false" },
      { key: "weekly_report", value: "true" },
    ]);
    expect(result.siteName).toBe("New Hub");
    expect(result.emailAlerts).toBe(false);
    expect(result.weeklyReport).toBe(true);
    expect(result.failureAlerts).toBe(true);
  });

  it("skips the write when nothing is provided", async () => {
    const { service, repository } = makeService();
    repository.findAllSettings.mockResolvedValue([]);

    await service.updateSettings({});
    expect(repository.upsertMany).not.toHaveBeenCalled();
  });
});
