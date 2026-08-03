import { describe, expect, it } from "vitest";

import { scraperHealthParamsSchema } from "@/validators/scraper-health";

describe("scraperHealthParamsSchema", () => {
  it("accepts a bank code", () => {
    expect(scraperHealthParamsSchema.safeParse({ bankCode: "ABY" }).success).toBe(true);
  });

  it("rejects empty and missing codes", () => {
    expect(scraperHealthParamsSchema.safeParse({ bankCode: "" }).success).toBe(false);
    expect(scraperHealthParamsSchema.safeParse({}).success).toBe(false);
  });
});
