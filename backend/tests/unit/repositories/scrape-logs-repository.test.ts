import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { ScrapeLogsRepository } from "@/repositories/ScrapeLogsRepository";
import type { Database } from "@/types/database";

import { scrapeLogs } from "../../fixtures/scrape-logs";
import { createFakeSupabaseClient } from "../../helpers/supabase-client";

function makeRepo(): ScrapeLogsRepository {
  const client = createFakeSupabaseClient({ scrape_logs: [...scrapeLogs] });
  return new ScrapeLogsRepository(client as unknown as SupabaseClient<Database>);
}

describe("ScrapeLogsRepository", () => {
  it("findByBankCode returns all logs for a bank", async () => {
    const rows = await makeRepo().findByBankCode("ABY");
    expect(rows).toHaveLength(2);
  });

  it("findByRunId returns all logs for a run", async () => {
    const rows = await makeRepo().findByRunId("run-a");
    expect(rows).toHaveLength(2);
  });

  it("returns empty arrays for unknown keys", async () => {
    expect(await makeRepo().findByBankCode("NOPE")).toEqual([]);
    expect(await makeRepo().findByRunId("nope")).toEqual([]);
  });
});
