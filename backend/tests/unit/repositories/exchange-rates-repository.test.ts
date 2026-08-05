import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { ExchangeRatesRepository } from "@/repositories/ExchangeRatesRepository";
import type { Database } from "@/types/database";

import { exchangeRates } from "../../fixtures/exchange-rates";
import { createFakeSupabaseClient } from "../../mocks/supabase-client";

function makeRepo(): ExchangeRatesRepository {
  const client = createFakeSupabaseClient({ exchange_rates: [...exchangeRates] });
  return new ExchangeRatesRepository(client as unknown as SupabaseClient<Database>);
}

describe("ExchangeRatesRepository", () => {
  it("findLatestByBankAndCurrency returns the newest dated row", async () => {
    const rate = await makeRepo().findLatestByBankAndCurrency("ABY", "USD");
    expect(rate?.rate_date).toBe("2026-08-01");
    expect(rate?.buying_rate).toBe(121.5);
  });

  it("findLatestByBankAndCurrency returns null when absent", async () => {
    expect(await makeRepo().findLatestByBankAndCurrency("NOPE", "USD")).toBeNull();
  });

  it("findByBankAndCurrency returns the exact-date row when given a date", async () => {
    const rate = await makeRepo().findByBankAndCurrency("ABY", "USD", "2026-07-30");
    expect(rate?.buying_rate).toBe(120.0);
  });

  it("findByBankAndCurrency falls back to latest when no date is given", async () => {
    const rate = await makeRepo().findByBankAndCurrency("ABY", "USD");
    expect(rate?.rate_date).toBe("2026-08-01");
  });

  it("findByCurrency returns all rows for a currency", async () => {
    const rows = await makeRepo().findByCurrency("USD");
    expect(rows).toHaveLength(3);
  });

  it("findAll returns all 1500 rows past PostgREST's single-page cap", async () => {
    const seeded = Array.from({ length: 1500 }, (_, index) => ({
      ...exchangeRates[0]!,
      id: `rate-${index}`,
      bank_code: `BK${String(index).padStart(4, "0")}`,
      rate_date: index === 1499 ? "2026-08-05" : "2026-08-04",
    }));
    const repo = new ExchangeRatesRepository(
      createFakeSupabaseClient({ exchange_rates: seeded }) as unknown as SupabaseClient<Database>,
    );

    const all = await repo.findAll();
    expect(all).toHaveLength(1500);
    expect(all[1499]?.rate_date).toBe("2026-08-05");
    expect(new Set(all.map((r) => r.id)).size).toBe(all.length);
  });
});
