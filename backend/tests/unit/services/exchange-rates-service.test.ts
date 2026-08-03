import { describe, expect, it } from "vitest";

import { NotFoundError, ValidationError } from "@/lib/errors";
import { ExchangeRatesServiceImpl } from "@/services/ExchangeRatesService";

import { exchangeRates } from "../../fixtures/exchange-rates";
import { createMockBanksService } from "../../mocks/services";
import { createMockExchangeRatesRepository } from "../../mocks/repositories";

function makeService() {
  const repository = createMockExchangeRatesRepository();
  const banksService = createMockBanksService();
  banksService.validateBankExists.mockResolvedValue(undefined);
  const service = new ExchangeRatesServiceImpl(repository, banksService);
  return { service, repository, banksService };
}

describe("ExchangeRatesServiceImpl.getLatestRates", () => {
  it("resolves duplicates to one newest row per bank + currency, sorted", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);
    const rates = await service.getLatestRates();
    expect(rates).toHaveLength(3); // ABY/USD, CBE/USD, ABY/EUR
    const abyUsd = rates.find((r) => r.bank_code === "ABY" && r.currency_code === "USD");
    expect(abyUsd?.rate_date).toBe("2026-08-01");
  });

  it("applies the date range before resolving", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);
    const rates = await service.getLatestRates({ from: "2026-08-01" });
    expect(rates.every((r) => r.rate_date >= "2026-08-01")).toBe(true);
  });

  it("rejects an invalid date and an inverted range", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);
    await expect(service.getLatestRates({ from: "nope" })).rejects.toBeInstanceOf(ValidationError);
    await expect(
      service.getLatestRates({ from: "2026-08-02", to: "2026-08-01" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("ExchangeRatesServiceImpl.getLatestRatesByCurrency", () => {
  it("returns resolved rates for the currency", async () => {
    const { service, repository } = makeService();
    repository.findByCurrency.mockResolvedValue(
      exchangeRates.filter((r) => r.currency_code === "USD"),
    );
    const rates = await service.getLatestRatesByCurrency("USD");
    expect(rates).toHaveLength(2); // ABY + CBE
  });

  it("throws ValidationError for a malformed currency code", async () => {
    const { service } = makeService();
    await expect(service.getLatestRatesByCurrency("usd")).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("ExchangeRatesServiceImpl.getLatestRatesByBank", () => {
  it("validates the bank, resolves per currency, and sorts", async () => {
    const { service, repository, banksService } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);
    const rates = await service.getLatestRatesByBank("ABY");
    expect(banksService.validateBankExists).toHaveBeenCalledWith("ABY");
    expect(rates.map((r) => r.currency_code)).toEqual(["EUR", "USD"]);
  });

  it("propagates NotFoundError when the bank does not exist", async () => {
    const { service, banksService } = makeService();
    banksService.validateBankExists.mockRejectedValue(new NotFoundError("nope"));
    await expect(service.getLatestRatesByBank("NOPE")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("ExchangeRatesServiceImpl.getLatestRateByBankAndCurrency", () => {
  it("returns the row when it exists", async () => {
    const { service, repository } = makeService();
    repository.findLatestByBankAndCurrency.mockResolvedValue(exchangeRates[1]!);
    const rate = await service.getLatestRateByBankAndCurrency("ABY", "USD");
    expect(rate?.buying_rate).toBe(121.5);
  });

  it("returns null when no row exists", async () => {
    const { service, repository } = makeService();
    repository.findLatestByBankAndCurrency.mockResolvedValue(null);
    expect(await service.getLatestRateByBankAndCurrency("ABY", "USD")).toBeNull();
  });

  it("rejects a malformed currency", async () => {
    const { service } = makeService();
    await expect(service.getLatestRateByBankAndCurrency("ABY", "xx")).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

describe("ExchangeRatesServiceImpl.getHistoricalRates", () => {
  it("returns oldest-first history filtered by the range", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);
    const rates = await service.getHistoricalRates("ABY", "USD");
    expect(rates.map((r) => r.rate_date)).toEqual(["2026-07-30", "2026-08-01"]);
  });

  it("propagates NotFoundError for an unknown bank", async () => {
    const { service, banksService } = makeService();
    banksService.validateBankExists.mockRejectedValue(new NotFoundError("nope"));
    await expect(service.getHistoricalRates("NOPE", "USD")).rejects.toBeInstanceOf(NotFoundError);
  });
});
