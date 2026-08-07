import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { BanksRepository } from "@/repositories/BanksRepository";
import { ManualRatesRepository } from "@/repositories/ManualRatesRepository";
import { BanksServiceImpl } from "@/services/BanksService";
import { ManualRatesServiceImpl } from "@/services/ManualRatesService";
import type { BankRow, Database, ManualRateRow } from "@/types/database";

import { banks } from "../../fixtures/banks";
import { manualRates } from "../../fixtures/manual-rates";
import { createFakeSupabaseClient } from "../../helpers/supabase-client";

/**
 * Builds the real service wired to real repositories over a seeded in-memory
 * client. `seedManualRates`/`seedBanks` control the data the repositories see.
 */
function makeService(seedManualRates: ManualRateRow[] = [], seedBanks: BankRow[] = banks) {
  const client = createFakeSupabaseClient({
    manual_rates: [...seedManualRates],
    banks: [...seedBanks],
  });
  const repository = new ManualRatesRepository(client as unknown as SupabaseClient<Database>);
  const banksService = new BanksServiceImpl(
    new BanksRepository(client as unknown as SupabaseClient<Database>),
  );
  const service = new ManualRatesServiceImpl(repository, banksService);
  return { service, repository, client };
}

const validInput = {
  bank_code: "ABY",
  currency_code: "USD",
  buying_rate: 121.4,
  selling_rate: 122.2,
  rate_date: "2026-08-02",
};

describe("ManualRatesServiceImpl.createManualRate", () => {
  it("validates, checks duplicates, and inserts with normalized note + timestamps", async () => {
    const { service, client } = makeService();
    const created = await service.createManualRate({ ...validInput, note: "   " });

    expect(created.bank_code).toBe("ABY");
    expect(created.note).toBeNull();
    expect(created.entered_by).toBeNull();
    expect(created.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // The row is really persisted in the in-memory table.
    const stored = client.tables.get("manual_rates")!.find((r) => r.id === created.id);
    expect(stored?.note).toBeNull();
  });

  it("throws ConflictError when the exact key already exists", async () => {
    const { service } = makeService(manualRates);
    await expect(service.createManualRate(validInput)).rejects.toBeInstanceOf(ConflictError);
  });

  it("propagates NotFoundError when the bank is missing", async () => {
    const { service } = makeService([], []);
    await expect(service.createManualRate(validInput)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects invalid currency, date, and non-positive rates", async () => {
    const { service } = makeService();
    await expect(
      service.createManualRate({ ...validInput, currency_code: "xx" }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      service.createManualRate({ ...validInput, rate_date: "nope" }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      service.createManualRate({ ...validInput, buying_rate: 0 }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("ManualRatesServiceImpl.updateManualRate", () => {
  it("updates an existing rate and re-checks duplicates excluding itself", async () => {
    const { service } = makeService(manualRates);
    const updated = await service.updateManualRate("manual-1", { selling_rate: 123 });
    expect(updated.id).toBe("manual-1");
    expect(updated.selling_rate).toBe(123);
  });

  it("throws NotFoundError when the rate does not exist", async () => {
    const { service } = makeService([]);
    await expect(service.updateManualRate("missing", { note: "x" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("throws ConflictError when an update collides with another row", async () => {
    const { service } = makeService(manualRates);
    // manual-2 currently occupies CBE/EUR 08-01; moving it onto ABY/USD 08-02
    // (manual-1's key) must conflict.
    await expect(
      service.updateManualRate("manual-2", {
        bank_code: "ABY",
        currency_code: "USD",
        rate_date: "2026-08-02",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("applies an empty update payload when no fields are provided", async () => {
    const { service } = makeService(manualRates);
    const result = await service.updateManualRate("manual-1", {});
    expect(result.id).toBe("manual-1");
  });
});

describe("ManualRatesServiceImpl.deleteManualRate", () => {
  it("deletes an existing rate", async () => {
    const { service, client } = makeService(manualRates);
    await expect(service.deleteManualRate("manual-1")).resolves.toBeUndefined();
    expect(client.tables.get("manual_rates")!.some((r) => r.id === "manual-1")).toBe(false);
  });

  it("throws NotFoundError when the rate is missing", async () => {
    const { service } = makeService([]);
    await expect(service.deleteManualRate("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("ManualRatesServiceImpl.listManualRates", () => {
  it("returns rows newest-first", async () => {
    const { service } = makeService(manualRates);
    const rows = await service.listManualRates();
    expect(rows[0]?.rate_date).toBe("2026-08-02");
  });

  it("filters by bank, currency, and date", async () => {
    const { service } = makeService(manualRates);
    expect(await service.listManualRates({ bankCode: "CBE" })).toHaveLength(1);
    expect(await service.listManualRates({ currencyCode: "EUR" })).toHaveLength(1);
    expect(await service.listManualRates({ rateDate: "2026-08-02" })).toHaveLength(1);
  });
});
