import { describe, expect, it } from "vitest";

import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { ManualRatesServiceImpl } from "@/services/ManualRatesService";

import { manualRates } from "../../fixtures/manual-rates";
import { createMockManualRatesRepository } from "../../mocks/repositories";
import { createMockBanksService } from "../../mocks/services";

function makeService() {
  const repository = createMockManualRatesRepository();
  const banksService = createMockBanksService();
  banksService.validateBankExists.mockResolvedValue(undefined);
  const service = new ManualRatesServiceImpl(repository, banksService);
  return { service, repository, banksService };
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
    const { service, repository } = makeService();
    repository.findOneBy.mockResolvedValue(null);
    repository.insert.mockResolvedValue(manualRates[0]!);

    const created = await service.createManualRate({ ...validInput, note: "   " });

    expect(repository.insert).toHaveBeenCalledTimes(1);
    const payload = repository.insert.mock.calls[0][0] as {
      note: string | null;
      created_at: string;
      entered_by: string | null;
    };
    expect(payload.note).toBeNull();
    expect(payload.entered_by).toBeNull();
    expect(payload.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(created.bank_code).toBe("ABY");
  });

  it("throws ConflictError when the exact key already exists", async () => {
    const { service, repository } = makeService();
    repository.findOneBy.mockResolvedValue(manualRates[0]!);
    await expect(service.createManualRate(validInput)).rejects.toBeInstanceOf(ConflictError);
  });

  it("propagates NotFoundError when the bank is missing", async () => {
    const { service, banksService } = makeService();
    banksService.validateBankExists.mockRejectedValue(new NotFoundError("nope"));
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
    const { service, repository } = makeService();
    repository.findOneBy.mockImplementation(async (where) =>
      (where as { id?: string }).id === "manual-1" ? manualRates[0]! : null,
    );
    repository.updateBy.mockResolvedValue({ ...manualRates[0]!, selling_rate: 123 });

    const updated = await service.updateManualRate("manual-1", { selling_rate: 123 });

    expect(updated.selling_rate).toBe(123);
    const dupCall = repository.findOneBy.mock.calls.find(
      ([where]) => !(where as { id?: string }).id,
    );
    expect(dupCall).toBeDefined();
  });

  it("throws NotFoundError when the rate does not exist", async () => {
    const { service, repository } = makeService();
    repository.findOneBy.mockResolvedValue(null);
    await expect(service.updateManualRate("missing", { note: "x" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("throws ConflictError when an update collides with another row", async () => {
    const { service, repository } = makeService();
    repository.findOneBy.mockImplementation(async (where) => {
      if ((where as { id?: string }).id === "manual-2") return manualRates[1]!;
      return manualRates[0]!; // the "other" row occupying the target key
    });
    await expect(
      service.updateManualRate("manual-2", {
        bank_code: "ABY",
        currency_code: "USD",
        rate_date: "2026-08-02",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("applies an empty update payload when no fields are provided", async () => {
    const { service, repository } = makeService();
    repository.findOneBy.mockResolvedValue(manualRates[0]!);
    repository.updateBy.mockResolvedValue(manualRates[0]!);
    const result = await service.updateManualRate("manual-1", {});
    expect(repository.updateBy).toHaveBeenCalledWith({ id: "manual-1" }, {});
    expect(result.id).toBe("manual-1");
  });
});

describe("ManualRatesServiceImpl.deleteManualRate", () => {
  it("deletes an existing rate", async () => {
    const { service, repository } = makeService();
    repository.findOneBy.mockResolvedValue(manualRates[0]!);
    repository.deleteBy.mockResolvedValue(true);
    await expect(service.deleteManualRate("manual-1")).resolves.toBeUndefined();
    expect(repository.deleteBy).toHaveBeenCalledWith({ id: "manual-1" });
  });

  it("throws NotFoundError when the rate is missing", async () => {
    const { service, repository } = makeService();
    repository.findOneBy.mockResolvedValue(null);
    await expect(service.deleteManualRate("missing")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when the delete removes nothing", async () => {
    const { service, repository } = makeService();
    repository.findOneBy.mockResolvedValue(manualRates[0]!);
    repository.deleteBy.mockResolvedValue(false);
    await expect(service.deleteManualRate("manual-1")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("ManualRatesServiceImpl.listManualRates", () => {
  it("returns rows newest-first", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(manualRates);
    const rows = await service.listManualRates();
    expect(rows[0]?.rate_date).toBe("2026-08-02");
  });

  it("filters by bank, currency, and date", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(manualRates);
    expect(await service.listManualRates({ bankCode: "CBE" })).toHaveLength(1);
    expect(await service.listManualRates({ currencyCode: "EUR" })).toHaveLength(1);
    expect(await service.listManualRates({ rateDate: "2026-08-02" })).toHaveLength(1);
  });
});
