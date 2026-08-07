import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { NotFoundError, ValidationError } from "@/lib/errors";
import { BanksRepository } from "@/repositories/BanksRepository";
import { BanksServiceImpl } from "@/services/BanksService";
import type { BankRow, Database } from "@/types/database";

import { banks } from "../../fixtures/banks";
import { createFakeSupabaseClient } from "../../helpers/supabase-client";

/** Builds the real service wired to a real repository over a seeded in-memory client. */
function makeService(seedBanks: BankRow[] = banks) {
  const client = createFakeSupabaseClient({ banks: [...seedBanks] });
  const repository = new BanksRepository(client as unknown as SupabaseClient<Database>);
  const service = new BanksServiceImpl(repository);
  return { service, repository };
}

describe("BanksServiceImpl.listBanks", () => {
  it("returns all banks sorted by name when no filter is given", async () => {
    const { service } = makeService();
    const result = await service.listBanks();
    expect(result.map((b) => b.bank_code)).toEqual(["ABY", "CBE", "DASH"]);
  });

  it("uses the repository's listActive when activeOnly is set", async () => {
    const { service } = makeService();
    const result = await service.listBanks({ activeOnly: true });
    expect(result.map((b) => b.bank_code)).toEqual(["ABY", "CBE"]);
  });

  it("filters by bank type", async () => {
    const { service } = makeService();
    const result = await service.listBanks({ bankType: "private" });
    expect(result.map((b) => b.bank_code)).toEqual(["ABY", "DASH"]);
  });
});

describe("BanksServiceImpl.listActiveBanks", () => {
  it("delegates to listBanks with activeOnly", async () => {
    const { service } = makeService();
    const result = await service.listActiveBanks();
    expect(result.map((b) => b.bank_code)).toEqual(["ABY", "CBE"]);
  });
});

describe("BanksServiceImpl.findByBankCode", () => {
  it("returns the bank when found", async () => {
    const { service } = makeService();
    expect((await service.findByBankCode("ABY")).bank_code).toBe("ABY");
  });

  it("throws NotFoundError when absent", async () => {
    const { service } = makeService();
    await expect(service.findByBankCode("NOPE")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("BanksServiceImpl.validateBankExists", () => {
  it("resolves when the bank exists", async () => {
    const { service } = makeService();
    await expect(service.validateBankExists("ABY")).resolves.toBeUndefined();
  });

  it("throws NotFoundError when absent", async () => {
    const { service } = makeService();
    await expect(service.validateBankExists("NOPE")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("BanksServiceImpl.validateBankActive", () => {
  it("resolves for an active bank", async () => {
    const { service } = makeService();
    await expect(service.validateBankActive("ABY")).resolves.toBeUndefined();
  });

  it("throws ValidationError for an inactive bank", async () => {
    const { service } = makeService();
    await expect(service.validateBankActive("DASH")).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws ValidationError when is_active is null", async () => {
    const { service } = makeService([{ ...banks[0]!, is_active: null }, ...banks.slice(1)]);
    await expect(service.validateBankActive("ABY")).rejects.toBeInstanceOf(ValidationError);
  });

  it("propagates NotFoundError for a missing bank", async () => {
    const { service } = makeService();
    await expect(service.validateBankActive("NOPE")).rejects.toBeInstanceOf(NotFoundError);
  });
});
