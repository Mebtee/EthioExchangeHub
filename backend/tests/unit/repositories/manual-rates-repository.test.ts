import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { ManualRatesRepository } from "@/repositories/ManualRatesRepository";
import type { Database } from "@/types/database";

import { manualRates } from "../../fixtures/manual-rates";
import { createFakeSupabaseClient } from "../../helpers/supabase-client";

function makeRepo(): ManualRatesRepository {
  const client = createFakeSupabaseClient({ manual_rates: [...manualRates] });
  return new ManualRatesRepository(client as unknown as SupabaseClient<Database>);
}

describe("ManualRatesRepository", () => {
  it("findLatestByBankAndCurrency returns the newest dated row", async () => {
    const rate = await makeRepo().findLatestByBankAndCurrency("ABY", "USD");
    expect(rate?.rate_date).toBe("2026-08-02");
  });

  it("findLatestByBankAndCurrency returns null when absent", async () => {
    expect(await makeRepo().findLatestByBankAndCurrency("NOPE", "USD")).toBeNull();
  });

  it("findByBankAndCurrency returns the exact-date row when given a date", async () => {
    const rate = await makeRepo().findByBankAndCurrency("CBE", "EUR", "2026-08-01");
    expect(rate?.id).toBe("manual-2");
  });

  it("findByBankAndCurrency falls back to latest when no date is given", async () => {
    const rate = await makeRepo().findByBankAndCurrency("ABY", "USD");
    expect(rate?.id).toBe("manual-1");
  });
});
