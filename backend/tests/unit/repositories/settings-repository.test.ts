import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { SettingsRepository } from "@/repositories/SettingsRepository";
import type { Database } from "@/types/database";

import { settings } from "../../fixtures/settings";
import { createFakeSupabaseClient } from "../../helpers/supabase-client";

function makeRepo(): SettingsRepository {
  const client = createFakeSupabaseClient({ settings: [...settings] });
  return new SettingsRepository(client as unknown as SupabaseClient<Database>);
}

describe("SettingsRepository", () => {
  it("findAllSettings returns every row", async () => {
    const rows = await makeRepo().findAllSettings();
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.key).sort()).toEqual([
      "admin_name",
      "default_currency",
      "email_alerts",
      "site_name",
    ]);
  });

  it("findAllSettings returns an empty list for an empty table", async () => {
    const client = createFakeSupabaseClient({ settings: [] });
    const repo = new SettingsRepository(client as unknown as SupabaseClient<Database>);
    expect(await repo.findAllSettings()).toEqual([]);
  });

  it("upsertMany updates an existing key and inserts a missing one", async () => {
    const repo = makeRepo();
    const saved = await repo.upsertMany([
      { key: "admin_name", value: "New Name" },
      { key: "timezone", value: "Africa/Addis_Ababa" },
    ]);
    expect(saved).toHaveLength(2);

    const rows = await repo.findAllSettings();
    expect(rows.find((r) => r.key === "admin_name")?.value).toBe("New Name");
    expect(rows.find((r) => r.key === "timezone")?.value).toBe("Africa/Addis_Ababa");
    expect(rows.find((r) => r.key === "site_name")?.value).toBe("Ethio Exchange Hub");
  });

  it("upsertMany stamps updated_at on writes", async () => {
    const repo = makeRepo();
    const [saved] = await repo.upsertMany([{ key: "admin_name", value: "New Name" }]);
    expect(saved?.updated_at).toBeTypeOf("string");
  });
});
