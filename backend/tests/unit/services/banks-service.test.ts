import { describe, expect, it } from "vitest";

import { NotFoundError, ValidationError } from "@/lib/errors";
import { BanksServiceImpl } from "@/services/BanksService";

import { banks } from "../../fixtures/banks";
import { createMockBanksRepository } from "../../mocks/repositories";

function makeService() {
  const repository = createMockBanksRepository();
  const service = new BanksServiceImpl(repository);
  return { service, repository };
}

describe("BanksServiceImpl.listBanks", () => {
  it("returns all banks sorted by name when no filter is given", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue([banks[1]!, banks[0]!]);
    const result = await service.listBanks();
    expect(result.map((b) => b.bank_code)).toEqual(["ABY", "CBE"]);
  });

  it("uses the repository's listActive when activeOnly is set", async () => {
    const { service, repository } = makeService();
    repository.listActive.mockResolvedValue([banks[0]!]);
    await service.listBanks({ activeOnly: true });
    expect(repository.listActive).toHaveBeenCalledTimes(1);
    expect(repository.findAll).not.toHaveBeenCalled();
  });

  it("filters by bank type", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(banks);
    const result = await service.listBanks({ bankType: "private" });
    expect(result.every((b) => b.bank_type === "private")).toBe(true);
  });
});

describe("BanksServiceImpl.listActiveBanks", () => {
  it("delegates to listBanks with activeOnly", async () => {
    const { service, repository } = makeService();
    repository.listActive.mockResolvedValue([banks[0]!]);
    const result = await service.listActiveBanks();
    expect(result).toHaveLength(1);
  });
});

describe("BanksServiceImpl.findByBankCode", () => {
  it("returns the bank when found", async () => {
    const { service, repository } = makeService();
    repository.findByBankCode.mockResolvedValue(banks[0]!);
    expect((await service.findByBankCode("ABY")).bank_code).toBe("ABY");
  });

  it("throws NotFoundError when absent", async () => {
    const { service, repository } = makeService();
    repository.findByBankCode.mockResolvedValue(null);
    await expect(service.findByBankCode("NOPE")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("BanksServiceImpl.validateBankExists", () => {
  it("resolves when the bank exists", async () => {
    const { service, repository } = makeService();
    repository.findByBankCode.mockResolvedValue(banks[0]!);
    await expect(service.validateBankExists("ABY")).resolves.toBeUndefined();
  });

  it("throws NotFoundError when absent", async () => {
    const { service, repository } = makeService();
    repository.findByBankCode.mockResolvedValue(null);
    await expect(service.validateBankExists("NOPE")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("BanksServiceImpl.validateBankActive", () => {
  it("resolves for an active bank", async () => {
    const { service, repository } = makeService();
    repository.findByBankCode.mockResolvedValue(banks[0]!);
    await expect(service.validateBankActive("ABY")).resolves.toBeUndefined();
  });

  it("throws ValidationError for an inactive bank", async () => {
    const { service, repository } = makeService();
    repository.findByBankCode.mockResolvedValue(banks[2]!); // is_active: false
    await expect(service.validateBankActive("DASH")).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws ValidationError when is_active is null", async () => {
    const { service, repository } = makeService();
    repository.findByBankCode.mockResolvedValue({ ...banks[0]!, is_active: null });
    await expect(service.validateBankActive("ABY")).rejects.toBeInstanceOf(ValidationError);
  });

  it("propagates NotFoundError for a missing bank", async () => {
    const { service, repository } = makeService();
    repository.findByBankCode.mockResolvedValue(null);
    await expect(service.validateBankActive("NOPE")).rejects.toBeInstanceOf(NotFoundError);
  });
});
