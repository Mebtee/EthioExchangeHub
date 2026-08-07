import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { adminProfileDefaults, adminSettingsDefaults } from "@/config/admin";
import { SettingsRepository } from "@/repositories/SettingsRepository";
import { SettingsServiceImpl } from "@/services/SettingsService";
import type { Database, SettingRow } from "@/types/database";

import { settings } from "../../fixtures/settings";
import { createFakeSupabaseClient } from "../../helpers/supabase-client";

/** Builds the real service over a real repository seeded with setting rows. */
function makeService(rows: SettingRow[] = settings) {
  const client = createFakeSupabaseClient({ settings: [...rows] });
  const repository = new SettingsRepository(client as unknown as SupabaseClient<Database>);
  const service = new SettingsServiceImpl(repository);
  return { service, client };
}

describe("SettingsServiceImpl.getProfile", () => {
  it("returns the configured defaults when nothing is persisted", async () => {
    const { service } = makeService([]);
    const profile = await service.getProfile();
    expect(profile.name).toBe(adminProfileDefaults.name);
    expect(profile.email).toBe(adminProfileDefaults.email);
    expect(profile.role).toBe(adminProfileDefaults.role);
    expect(profile.initials).toBe("AD");
  });

  it("prefers persisted values and derives initials from the stored name", async () => {
    const { service } = makeService();
    const profile = await service.getProfile();
    expect(profile.name).toBe("Root Admin");
    expect(profile.initials).toBe("RA");
    expect(profile.email).toBe(adminProfileDefaults.email);
    expect(profile.role).toBe(adminProfileDefaults.role);
  });
});

describe("SettingsServiceImpl.updateProfile", () => {
  it("persists only the provided fields and re-reads the merged profile", async () => {
    const { service, client } = makeService();
    const profile = await service.updateProfile({ name: "Jane Doe", email: "jane@example.com" });
    expect(profile.name).toBe("Jane Doe");
    expect(profile.initials).toBe("JD");
    // The rows are really persisted in the in-memory table.
    const stored = new Map(client.tables.get("settings")!.map((r) => [r.key, r.value]));
    expect(stored.get("admin_name")).toBe("Jane Doe");
    expect(stored.get("admin_email")).toBe("jane@example.com");
  });

  it("skips the write when nothing is provided", async () => {
    const { service, client } = makeService([]);
    const profile = await service.updateProfile({});
    expect(profile.name).toBe(adminProfileDefaults.name);
    expect(client.tables.get("settings") ?? []).toHaveLength(0);
  });
});

describe("SettingsServiceImpl.getSettings", () => {
  it("merges persisted values over the configured defaults", async () => {
    const { service } = makeService();
    const result = await service.getSettings();
    expect(result.siteName).toBe("Ethio Exchange Hub");
    expect(result.defaultCurrency).toBe("USD");
    expect(result.emailAlerts).toBe(true);
    expect(result.failureAlerts).toBe(adminSettingsDefaults.failureAlerts);
    expect(result.weeklyReport).toBe(adminSettingsDefaults.weeklyReport);
    expect(result.timezone).toBe(adminSettingsDefaults.timezone);
  });

  it("returns all configured defaults for an empty table", async () => {
    const { service } = makeService([]);
    const result = await service.getSettings();
    expect(result).toEqual({ ...adminSettingsDefaults });
  });
});

describe("SettingsServiceImpl.updateSettings", () => {
  it("serializes booleans and persists the given fields, then re-reads", async () => {
    const { service, client } = makeService();
    const result = await service.updateSettings({
      siteName: "New Hub",
      emailAlerts: false,
      weeklyReport: true,
    });
    expect(result.siteName).toBe("New Hub");
    expect(result.emailAlerts).toBe(false);
    expect(result.weeklyReport).toBe(true);
    // The rows are really persisted with serialized string values.
    const stored = new Map(client.tables.get("settings")!.map((r) => [r.key, r.value]));
    expect(stored.get("site_name")).toBe("New Hub");
    expect(stored.get("email_alerts")).toBe("false");
    expect(stored.get("weekly_report")).toBe("true");
  });

  it("skips the write when nothing is provided", async () => {
    const { service, client } = makeService([]);
    const result = await service.updateSettings({});
    expect(result).toEqual({ ...adminSettingsDefaults });
    expect(client.tables.get("settings") ?? []).toHaveLength(0);
  });
});
