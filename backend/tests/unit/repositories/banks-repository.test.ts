import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { BanksRepository } from "@/repositories/BanksRepository";
import type { Database } from "@/types/database";

import { banks } from "../../fixtures/banks";
import { createFakeSupabaseClient } from "../../helpers/supabase-client";

function makeRepo(): BanksRepository {
  const client = createFakeSupabaseClient({ banks: [...banks] });
  return new BanksRepository(client as unknown as SupabaseClient<Database>);
}

describe("BanksRepository", () => {
  it("findByBankCode returns the matching bank", async () => {
    const bank = await makeRepo().findByBankCode("ABY");
    expect(bank?.bank_name).toBe("Awash Bank");
  });

  it("findByBankCode returns null for an unknown code", async () => {
    expect(await makeRepo().findByBankCode("NOPE")).toBeNull();
  });

  it("listActive returns only active banks", async () => {
    const active = await makeRepo().listActive();
    expect(active.map((b) => b.bank_code).sort()).toEqual(["ABY", "CBE"]);
  });
});
