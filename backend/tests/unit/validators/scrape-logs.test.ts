import { describe, expect, it } from "vitest";

import { scrapeLogsByRunQuerySchema, scrapeLogsQuerySchema } from "@/validators/scrape-logs";

const UUID = "3fbf920e-2cf7-47d2-95d7-80b29d9a00d7";

describe("scrapeLogsQuerySchema", () => {
  it("accepts empty and full filters", () => {
    expect(scrapeLogsQuerySchema.safeParse({}).success).toBe(true);
    expect(
      scrapeLogsQuerySchema.safeParse({
        bankCode: "ABY",
        runId: UUID,
        status: "success",
        scenario: "updated",
        limit: "10",
        offset: "5",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid status", () => {
    expect(scrapeLogsQuerySchema.safeParse({ status: "running" }).success).toBe(false);
  });

  it("rejects invalid pagination", () => {
    expect(scrapeLogsQuerySchema.safeParse({ limit: "0" }).success).toBe(false);
    expect(scrapeLogsQuerySchema.safeParse({ offset: "-1" }).success).toBe(false);
  });

  it("rejects invalid runId and blank scenario", () => {
    expect(scrapeLogsQuerySchema.safeParse({ runId: "nope" }).success).toBe(false);
    expect(scrapeLogsQuerySchema.safeParse({ scenario: "   " }).success).toBe(false);
  });
});

describe("scrapeLogsByRunQuerySchema", () => {
  it("accepts valid pagination only", () => {
    expect(scrapeLogsByRunQuerySchema.safeParse({ limit: "25", offset: "0" }).success).toBe(true);
    expect(scrapeLogsByRunQuerySchema.safeParse({ limit: "0" }).success).toBe(false);
  });
});
