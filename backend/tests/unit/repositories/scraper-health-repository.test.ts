import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { ScraperHealthRepository } from "@/repositories/ScraperHealthRepository";
import type { Database } from "@/types/database";

import { scraperHealth } from "../../fixtures/scraper-health";
import { createFakeSupabaseClient } from "../../mocks/supabase-client";

function makeRepo(): ScraperHealthRepository {
  const client = createFakeSupabaseClient({ scraper_health: [...scraperHealth] });
  return new ScraperHealthRepository(client as unknown as SupabaseClient<Database>);
}

describe("ScraperHealthRepository", () => {
  it("findByBankCode returns the matching row", async () => {
    const row = await makeRepo().findByBankCode("ABY");
    expect(row?.status).toBe("unknown");
  });

  it("findByBankCode returns null for an unknown bank", async () => {
    expect(await makeRepo().findByBankCode("NOPE")).toBeNull();
  });
});
