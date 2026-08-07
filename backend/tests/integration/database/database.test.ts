/**
 * Database integration tests.
 *
 * Exercises the real repository + service wiring against the shared fake
 * Supabase client (seeded, never a real database): cross-table flows, error
 * wrapping, and the full create/update/delete lifecycle.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { BanksServiceImpl } from "@/services/BanksService";
import { ExchangeRatesServiceImpl } from "@/services/ExchangeRatesService";
import { ManualRatesServiceImpl } from "@/services/ManualRatesService";
import { ScraperHealthServiceImpl } from "@/services/ScraperHealthService";
import { ScrapeLogsServiceImpl } from "@/services/ScrapeLogsService";
import { BanksRepository } from "@/repositories/BanksRepository";
import { ExchangeRatesRepository } from "@/repositories/ExchangeRatesRepository";
import { ManualRatesRepository } from "@/repositories/ManualRatesRepository";
import { ScrapeLogsRepository } from "@/repositories/ScrapeLogsRepository";
import { DatabaseError } from "@/lib/errors";

import { defaultSeed, getFakeClient, seedFakeClient } from "../../helpers/supabase";

beforeEach(() => {
  seedFakeClient(defaultSeed);
});

describe("Repository + service flows against the fake database", () => {
  it("banks: active listing and by-code lookup", async () => {
    const service = new BanksServiceImpl(new BanksRepository(getFakeClient() as never));

    const active = await service.listActiveBanks();
    expect(active.map((b) => b.bank_code)).toEqual(["ABY", "CBE"]);

    const bank = await service.findByBankCode("CBE");
    expect(bank.bank_name).toBe("Commercial Bank of Ethiopia");
  });

  it("exchange rates: resolves the newest row per bank+currency (manual overrides applied)", async () => {
    const service = new ExchangeRatesServiceImpl(
      new ExchangeRatesRepository(getFakeClient() as never),
      new BanksServiceImpl(new BanksRepository(getFakeClient() as never)),
      new ManualRatesRepository(getFakeClient() as never),
    );

    const latest = await service.getLatestRates();
    // Scraped pairs (ABY/EUR, CBE/USD) plus manual-newest ABY/USD (08-02) and
    // manual-only CBE/EUR (08-01) — 4 resolved rows.
    expect(latest).toHaveLength(4);
    const abyUsd = latest.find((r) => r.bank_code === "ABY" && r.currency_code === "USD");
    expect(abyUsd?.rate_date).toBe("2026-08-02");
    expect(abyUsd?.source).toBe("MANUAL");

    const history = await service.getHistoricalRates("ABY", "USD");
    // Scraped 07-30 + 08-01, plus the manual ABY/USD override on 08-02.
    expect(history.map((r) => r.rate_date)).toEqual(["2026-07-30", "2026-08-01", "2026-08-02"]);
  });

  it("manual rates: create → duplicate conflict → update → delete lifecycle", async () => {
    const service = new ManualRatesServiceImpl(
      new ManualRatesRepository(getFakeClient() as never),
      new BanksServiceImpl(new BanksRepository(getFakeClient() as never)),
    );

    const created = await service.createManualRate({
      bank_code: "CBE",
      currency_code: "GBP",
      buying_rate: 132,
      selling_rate: 133,
      rate_date: "2026-08-03",
      note: "  manual  ",
    });
    expect(created.id).toBeTypeOf("string");
    expect(created.note).toBe("manual");
    expect(created.entered_by).toBeNull();

    // Duplicate on the exact key must conflict
    await expect(
      service.createManualRate({
        bank_code: "CBE",
        currency_code: "GBP",
        buying_rate: 132,
        selling_rate: 133,
        rate_date: "2026-08-03",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });

    const updated = await service.updateManualRate(created.id, { selling_rate: 134 });
    expect(updated.selling_rate).toBe(134);

    await service.deleteManualRate(created.id);
    await expect(service.deleteManualRate(created.id)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("scraper health: aggregate summary derived from scrape logs", async () => {
    const service = new ScraperHealthServiceImpl(
      new ScrapeLogsRepository(getFakeClient() as never),
    );
    const summary = await service.getSummary();
    // Derived from the seeded logs: ABY + CBE succeeded, DASH failed.
    expect(summary).toMatchObject({
      total: 3,
      healthy: 2,
      degraded: 0,
      failed: 1,
      unknown: 0,
    });
  });

  it("scrape logs: newest-first ordering and filtering", async () => {
    const service = new ScrapeLogsServiceImpl(new ScrapeLogsRepository(getFakeClient() as never));

    const all = await service.getLatestLogs();
    expect(all.map((l) => l.id)).toEqual(["log-2", "log-1", "log-3", "log-4"]);

    const success = await service.listLogs({ status: "success" });
    expect(success.map((l) => l.id)).toEqual(["log-2", "log-1", "log-4"]);

    const paged = await service.listLogs(undefined, { limit: 2, offset: 1 });
    expect(paged.map((l) => l.id)).toEqual(["log-1", "log-3"]);
  });

  it("wraps database failures in DatabaseError (never leaking raw Supabase errors)", async () => {
    getFakeClient().nextError = { code: "PGRST116", message: "boom" };
    const repository = new BanksRepository(getFakeClient() as never);

    await expect(repository.findAll()).rejects.toBeInstanceOf(DatabaseError);
    // The injected error was consumed; the next query succeeds.
    const banks = await repository.findAll();
    expect(banks).toHaveLength(3);
  });
});
