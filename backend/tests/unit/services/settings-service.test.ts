import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { adminProfileDefaults, adminSettingsDefaults } from "@/config/admin";
import { toAuthenticatedUser } from "@/lib/auth-user";
import { SettingsRepository } from "@/repositories/SettingsRepository";
import { UsersRepository } from "@/repositories/UsersRepository";
import { SettingsServiceImpl } from "@/services/SettingsService";
import type { Database, SettingRow, UserRow } from "@/types/database";

import { settings } from "../../fixtures/settings";
import { users } from "../../fixtures/users";
import { createFakeSupabaseClient } from "../../helpers/supabase-client";

/** Builds the real service over real repositories seeded with settings + users rows. */
function makeService(rows: SettingRow[] = settings, userRows: UserRow[] = users) {
  const client = createFakeSupabaseClient({ settings: [...rows], users: [...userRows] });
  const settingsRepository = new SettingsRepository(client as unknown as SupabaseClient<Database>);
  const usersRepository = new UsersRepository(client as unknown as SupabaseClient<Database>);
  const service = new SettingsServiceImpl(settingsRepository, usersRepository);
  return { service, client };
}

describe("SettingsServiceImpl.getProfile", () => {
  it("returns the authenticated user's real data with derived initials", async () => {
    const { service } = makeService();
    const profile = await service.getProfile(toAuthenticatedUser(users[0]));
    expect(profile.name).toBe("Operator");
    expect(profile.email).toBe("operator@ethioexchange.test");
    expect(profile.role).toBe("admin");
    expect(profile.initials).toBe("OP");
  });

  it("uses the user's created_at as member since and falls back to defaults when timestamps are null", async () => {
    const { service } = makeService();
    const profile = await service.getProfile(toAuthenticatedUser(users[0]));
    expect(profile.memberSince).toBe("2026-01-01T09:00:00.000Z");
    expect(profile.lastLogin).toBe(adminProfileDefaults.lastLogin);
  });
});

describe("SettingsServiceImpl.updateProfile", () => {
  it("persists the provided fields to the users table and re-reads the merged profile", async () => {
    const { service, client } = makeService();
    const user = toAuthenticatedUser(users[0]);
    const profile = await service.updateProfile(user, {
      name: "Jane Doe",
      email: "jane@example.com",
    });
    expect(profile.name).toBe("Jane Doe");
    expect(profile.email).toBe("jane@example.com");
    expect(profile.initials).toBe("JD");
    // The row is really persisted in the in-memory table.
    const stored = client.tables.get("users")![0] as UserRow;
    expect(stored.name).toBe("Jane Doe");
    expect(stored.email).toBe("jane@example.com");
  });

  it("skips the write when nothing is provided", async () => {
    const { service, client } = makeService();
    const profile = await service.updateProfile(toAuthenticatedUser(users[0]), {});
    expect(profile.name).toBe("Operator");
    expect(client.tables.get("users")).toHaveLength(1);
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
