import { describe, expect, it, vi } from "vitest";

import { NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { ExchangeRatesServiceImpl } from "@/services/ExchangeRatesService";
import type { ExchangeRateRow, ManualRateRow } from "@/types/database";

import { exchangeRates } from "../../fixtures/exchange-rates";
import { createMockBanksService } from "../../mocks/services";
import {
  createMockExchangeRatesRepository,
  createMockManualRatesRepository,
} from "../../mocks/repositories";

function makeService() {
  const repository = createMockExchangeRatesRepository();
  const manualRepository = createMockManualRatesRepository();
  const banksService = createMockBanksService();
  banksService.validateBankExists.mockResolvedValue(undefined);
  // No manual overrides by default — existing tests keep their behavior.
  manualRepository.findAll.mockResolvedValue([]);
  // Fixed reference date + window make the `stale` flag deterministic.
  const service = new ExchangeRatesServiceImpl(
    repository,
    banksService,
    manualRepository,
    7,
    () => "2026-08-05",
  );
  return { service, repository, manualRepository, banksService };
}

/** A manual override for ABY/USD on 2026-08-02 (newer than the scraped 08-01). */
function manualOverride(): ManualRateRow {
  return {
    id: "manual-x",
    bank_code: "ABY",
    currency_code: "USD",
    buying_rate: 121.4,
    selling_rate: 122.2,
    rate_date: "2026-08-02",
    entered_by: null,
    note: null,
    created_at: null,
  };
}

/** A scraped row helper for large-dataset resolution tests. */
function scrapedRow(
  bank_code: string,
  rate_date: string,
  id: string,
  scraped_at: string,
): ExchangeRateRow {
  return {
    id,
    bank_code,
    currency_code: "USD",
    buying_rate: 120,
    selling_rate: 121,
    transactional_buying: null,
    transactional_selling: null,
    weighted_avg_buying: null,
    weighted_avg_selling: null,
    rate_date,
    source: "SCRAPER",
    scraped_at,
  };
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

  it("resolves today's row even when it exists past row 1000 of the dataset", async () => {
    const { service, repository } = makeService();
    const rows: ExchangeRateRow[] = [];
    // 500 pairs dated 08-04 (rows 0..499).
    for (let i = 0; i < 500; i += 1) {
      rows.push(
        scrapedRow(
          `BK${String(i).padStart(3, "0")}`,
          "2026-08-04",
          `old-${i}`,
          "2026-08-04T08:00:00.000Z",
        ),
      );
    }
    // 500 more pairs dated 08-03 (rows 500..999).
    for (let i = 0; i < 500; i += 1) {
      rows.push(
        scrapedRow(
          `BZ${String(i).padStart(3, "0")}`,
          "2026-08-03",
          `filler-${i}`,
          "2026-08-03T08:00:00.000Z",
        ),
      );
    }
    // Today's rows for the first 500 pairs — every one is AFTER row 1000.
    for (let i = 0; i < 500; i += 1) {
      rows.push(
        scrapedRow(
          `BK${String(i).padStart(3, "0")}`,
          "2026-08-05",
          `today-${i}`,
          "2026-08-05T09:30:00.000Z",
        ),
      );
    }
    repository.findAll.mockResolvedValue(rows);

    const rates = await service.getLatestRates();
    // The first pair's newest rate lives at index 1000 — still resolved to today.
    expect(rates.find((r) => r.bank_code === "BK000")?.rate_date).toBe("2026-08-05");
    expect(rates.every((r) => r.rate_date === "2026-08-05" || r.rate_date === "2026-08-03")).toBe(
      true,
    );
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

describe("ExchangeRatesServiceImpl same-date scraped tie-break", () => {
  it("keeps the newest scraped_at when two scrapes share the same rate_date", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue([
      scrapedRow("ABY", "2026-08-05", "early-scan", "2026-08-05T06:00:00.000Z"),
      scrapedRow("ABY", "2026-08-05", "late-scan", "2026-08-05T09:30:00.000Z"),
    ]);

    const rates = await service.getLatestRates();
    expect(rates).toHaveLength(1);
    expect(rates[0]?.id).toBe("late-scan");
  });
});

describe("ExchangeRatesServiceImpl.getLatestRatesByCurrency", () => {
  it("returns resolved rates for the currency", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);
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

  it("includes manual overrides in the dated history (one row per date)", async () => {
    const { service, repository, manualRepository } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);
    manualRepository.findAll.mockResolvedValue([manualOverride()]); // ABY/USD 08-02

    const history = await service.getHistoricalRates("ABY", "USD");
    expect(history.map((r) => r.rate_date)).toEqual(["2026-07-30", "2026-08-01", "2026-08-02"]);
    expect(history[2]?.source).toBe("MANUAL");
  });

  it("prefers a manual override on a same-date history tie", async () => {
    const { service, repository, manualRepository } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);
    // Manual row sharing the scraped row's date (2026-08-01) — manual wins.
    manualRepository.findAll.mockResolvedValue([{ ...manualOverride(), rate_date: "2026-08-01" }]);

    const history = await service.getHistoricalRates("ABY", "USD");
    expect(history).toHaveLength(2);
    expect(history.find((r) => r.rate_date === "2026-08-01")?.source).toBe("MANUAL");
  });
});

describe("ExchangeRatesServiceImpl manual-override resolution", () => {
  it("applies manual overrides to the resolved latest snapshot", async () => {
    const { service, repository, manualRepository } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);
    manualRepository.findAll.mockResolvedValue([manualOverride()]);

    const rates = await service.getLatestRates();
    const abyUsd = rates.find((r) => r.bank_code === "ABY" && r.currency_code === "USD");
    expect(abyUsd?.rate_date).toBe("2026-08-02");
    expect(abyUsd?.buying_rate).toBe(121.4);
    expect(abyUsd?.source).toBe("MANUAL");
    expect(abyUsd?.transactional_buying).toBeNull();
  });

  it("prefers a manual override when dates tie", async () => {
    const { service, repository, manualRepository } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);
    // Same date as the newest scraped ABY/USD row (2026-08-01) — manual wins.
    manualRepository.findAll.mockResolvedValue([{ ...manualOverride(), rate_date: "2026-08-01" }]);

    const rates = await service.getLatestRates();
    const abyUsd = rates.find((r) => r.bank_code === "ABY" && r.currency_code === "USD");
    expect(abyUsd?.source).toBe("MANUAL");
    expect(abyUsd?.buying_rate).toBe(121.4);
  });

  it("keeps the scraped row when it is newer than the manual override", async () => {
    const { service, repository, manualRepository } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);
    manualRepository.findAll.mockResolvedValue([{ ...manualOverride(), rate_date: "2026-07-29" }]);

    const rates = await service.getLatestRates();
    const abyUsd = rates.find((r) => r.bank_code === "ABY" && r.currency_code === "USD");
    expect(abyUsd?.rate_date).toBe("2026-08-01");
    expect(abyUsd?.source).toBe("SCRAPER");
  });

  it("introduces a pair that has no scraped row", async () => {
    const { service, repository, manualRepository } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);
    manualRepository.findAll.mockResolvedValue([
      { ...manualOverride(), bank_code: "CBE", currency_code: "EUR", rate_date: "2026-08-01" },
    ]);

    const rates = await service.getLatestRates();
    expect(rates.find((r) => r.bank_code === "CBE" && r.currency_code === "EUR")?.source).toBe(
      "MANUAL",
    );
  });

  it("applies overrides in the per-currency view", async () => {
    const { service, repository, manualRepository } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);
    manualRepository.findAll.mockResolvedValue([manualOverride()]);

    const rates = await service.getLatestRatesByCurrency("USD");
    const abyUsd = rates.find((r) => r.bank_code === "ABY");
    expect(abyUsd?.source).toBe("MANUAL");
    expect(abyUsd?.rate_date).toBe("2026-08-02");
  });

  it("applies overrides in the per-bank view", async () => {
    const { service, repository, manualRepository } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);
    manualRepository.findAll.mockResolvedValue([manualOverride()]);

    const rates = await service.getLatestRatesByBank("ABY");
    const usd = rates.find((r) => r.currency_code === "USD");
    expect(usd?.source).toBe("MANUAL");
    expect(usd?.rate_date).toBe("2026-08-02");
  });

  it("resolves a single pair with a manual override, newest wins", async () => {
    const { service, repository, manualRepository } = makeService();
    repository.findLatestByBankAndCurrency.mockResolvedValue(exchangeRates[1]!); // 2026-08-01
    manualRepository.findLatestByBankAndCurrency.mockResolvedValue(manualOverride()); // 08-02

    const rate = await service.getLatestRateByBankAndCurrency("ABY", "USD");
    expect(rate?.source).toBe("MANUAL");
    expect(rate?.rate_date).toBe("2026-08-02");
  });

  it("returns null for a pair neither source has", async () => {
    const { service, repository, manualRepository } = makeService();
    repository.findLatestByBankAndCurrency.mockResolvedValue(null);
    manualRepository.findLatestByBankAndCurrency.mockResolvedValue(null);

    expect(await service.getLatestRateByBankAndCurrency("ABY", "JPY")).toBeNull();
  });
});

describe("ExchangeRatesServiceImpl malformed rate_date handling", () => {
  it("excludes malformed rows and logs a per-value warning", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue([
      { ...exchangeRates[0]!, rate_date: "2026/07/30" },
      ...exchangeRates.slice(1),
    ]);
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});

    const rates = await service.getLatestRates();
    expect(rates.some((r) => r.rate_date === "2026/07/30")).toBe(false);
    expect(warn).toHaveBeenCalledWith(
      "Exchange-rate row carries a malformed rate_date and was excluded",
      { rate_date: "2026/07/30", retainedCount: 3 },
    );
    warn.mockRestore();
  });

  it("does not warn when every rate_date is valid", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});

    await service.getLatestRates();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("warns only once per distinct malformed value in a process", async () => {
    const { service, repository } = makeService();
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const malformedRow = { ...exchangeRates[0]!, rate_date: "2026/07/31" };

    repository.findAll.mockResolvedValue([malformedRow, ...exchangeRates.slice(1)]);
    await service.getLatestRates();
    await service.getLatestRates();

    // Two calls, same poisoned value — exactly one warn.
    const warnCalls = warn.mock.calls.filter(([message]) =>
      String(message).includes("malformed rate_date"),
    );
    expect(warnCalls).toHaveLength(1);
    expect(warnCalls[0]![1]).toEqual({ rate_date: "2026/07/31", retainedCount: 3 });
    warn.mockRestore();
  });
});

describe("ExchangeRatesServiceImpl staleness annotation (D2)", () => {
  it("marks every resolved row stale/non-stale per the window and never drops rows", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);

    const rates = await service.getLatestRates();
    // 07-30 is older than cutoff 2026-07-29? No — 07-30 >= 07-29, so fresh.
    expect(rates).toHaveLength(3);
    expect(rates.every((r) => typeof r.stale === "boolean")).toBe(true);
    // ABY/USD resolves to 08-01 → fresh.
    expect(rates.find((r) => r.bank_code === "ABY" && r.currency_code === "USD")?.stale).toBe(
      false,
    );
  });

  it("flags a stale manual-only row (no scraped competitor)", async () => {
    const { service, repository, manualRepository } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);
    // CBE/EUR has no scraped row; the manual row (07-20) wins by default and
    // is older than cutoff 2026-07-29 → stale.
    manualRepository.findAll.mockResolvedValue([
      { ...manualOverride(), bank_code: "CBE", currency_code: "EUR", rate_date: "2026-07-20" },
    ]);

    const rates = await service.getLatestRates();
    const cbeEur = rates.find((r) => r.bank_code === "CBE" && r.currency_code === "EUR");
    expect(cbeEur?.source).toBe("MANUAL");
    expect(cbeEur?.stale).toBe(true);
  });

  it("keeps a fresher scraped row over an older manual override (newest wins)", async () => {
    const { service, repository, manualRepository } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);
    manualRepository.findAll.mockResolvedValue([{ ...manualOverride(), rate_date: "2026-07-20" }]);

    const rates = await service.getLatestRates();
    const abyUsd = rates.find((r) => r.bank_code === "ABY" && r.currency_code === "USD");
    expect(abyUsd?.source).toBe("SCRAPER");
    expect(abyUsd?.stale).toBe(false);
  });

  it("annotates history rows with their own stale flag", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);

    const history = await service.getHistoricalRates("ABY", "USD");
    expect(history.map((r) => [r.rate_date, r.stale])).toEqual([
      ["2026-07-30", false],
      ["2026-08-01", false],
    ]);
  });
});

describe("ExchangeRatesServiceImpl.getRateTrend", () => {
  it("aggregates mean cash rates per rate date, oldest first", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);

    const trend = await service.getRateTrend();
    expect(trend.map((p) => p.label)).toEqual(["2026-07-30", "2026-08-01"]);
    expect(trend[0]).toEqual({ label: "2026-07-30", cashBuying: 120, cashSelling: 121 });
    // 2026-08-01: buying mean (121.5+119.5+140)/3 = 127; selling mean (122.5+120.5+141.5)/3 ≈ 128.17
    expect(trend[1]?.cashBuying).toBe(127);
    expect(trend[1]?.cashSelling).toBe(128.17);
  });

  it("returns only the newest `days` points when requested", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);

    const trend = await service.getRateTrend(1);
    expect(trend.map((p) => p.label)).toEqual(["2026-08-01"]);
  });

  it("narrows to one currency when requested", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);

    const trend = await service.getRateTrend(undefined, "USD");
    // 2026-08-01 USD-only: buying mean (121.5+119.5)/2 = 120.5
    expect(trend[1]).toEqual({ label: "2026-08-01", cashBuying: 120.5, cashSelling: 121.5 });
  });

  it("rejects a malformed currency filter", async () => {
    const { service } = makeService();
    await expect(service.getRateTrend(undefined, "usd")).rejects.toBeInstanceOf(ValidationError);
  });

  it("skips dates whose rates are all null and returns [] for an empty table", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue([
      {
        id: "rate-null",
        bank_code: "ABY",
        currency_code: "USD",
        buying_rate: null,
        selling_rate: null,
        transactional_buying: null,
        transactional_selling: null,
        weighted_avg_buying: null,
        weighted_avg_selling: null,
        rate_date: "2026-08-03",
        source: "SCRAPER",
        scraped_at: null,
      },
    ]);
    expect(await service.getRateTrend()).toEqual([]);

    repository.findAll.mockResolvedValue([]);
    expect(await service.getRateTrend()).toEqual([]);
  });
});

describe("ExchangeRatesServiceImpl.getMarketTicker", () => {
  it("derives the mean buying rate + percent change per currency from real rows", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);

    const ticker = await service.getMarketTicker();
    // EUR: only 08-01 (140.0) → change 0. USD: latest 08-01 mean (121.5+119.5)/2
    // = 120.5 vs previous 07-30 (120.0) → (0.5/120)*100 ≈ 0.42.
    expect(ticker).toEqual([
      { pair: "EUR/ETB", value: 140, change: 0 },
      { pair: "USD/ETB", value: 120.5, change: 0.42 },
    ]);
  });

  it("respects the limit", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);

    const ticker = await service.getMarketTicker(1);
    expect(ticker).toEqual([{ pair: "EUR/ETB", value: 140, change: 0 }]);
  });

  it("includes manual overrides in the newest value and its change", async () => {
    const { service, repository, manualRepository } = makeService();
    repository.findAll.mockResolvedValue(exchangeRates);
    // ABY/USD manual override on 08-02 (121.4) becomes the newest USD date.
    manualRepository.findAll.mockResolvedValue([manualOverride()]);

    const ticker = await service.getMarketTicker();
    const usd = ticker.find((t) => t.pair === "USD/ETB");
    // Latest 08-02 → 121.4; previous 08-01 mean → 120.5; (0.9/120.5)*100 ≈ 0.75.
    expect(usd).toEqual({ pair: "USD/ETB", value: 121.4, change: 0.75 });
  });

  it("returns an empty list when no rows exist", async () => {
    const { service, repository } = makeService();
    repository.findAll.mockResolvedValue([]);
    expect(await service.getMarketTicker()).toEqual([]);
  });
});
