import { describe, expect, it } from "vitest";

import {
  historyParamsSchema,
  latestByBankParamsSchema,
  latestRatesQuerySchema,
  ratePairParamsSchema,
} from "@/validators/exchange-rates";

describe("exchange-rate param schemas", () => {
  it("latestByBankParamsSchema accepts a bank code", () => {
    expect(latestByBankParamsSchema.safeParse({ bankCode: "ABY" }).success).toBe(true);
    expect(latestByBankParamsSchema.safeParse({ bankCode: "" }).success).toBe(false);
  });

  it("ratePairParamsSchema requires a valid currency", () => {
    expect(ratePairParamsSchema.safeParse({ bankCode: "ABY", currencyCode: "USD" }).success).toBe(
      true,
    );
    expect(ratePairParamsSchema.safeParse({ bankCode: "ABY", currencyCode: "usd" }).success).toBe(
      false,
    );
  });

  it("historyParamsSchema mirrors the pair schema", () => {
    expect(historyParamsSchema.safeParse({ bankCode: "ABY", currencyCode: "EUR" }).success).toBe(
      true,
    );
    expect(historyParamsSchema.safeParse({ bankCode: "ABY" }).success).toBe(false);
  });
});

describe("latestRatesQuerySchema", () => {
  it("accepts empty and valid date ranges", () => {
    expect(latestRatesQuerySchema.safeParse({}).success).toBe(true);
    expect(latestRatesQuerySchema.safeParse({ from: "2026-01-01", to: "2026-08-01" }).success).toBe(
      true,
    );
  });

  it("rejects invalid dates", () => {
    expect(latestRatesQuerySchema.safeParse({ from: "2026-13-01" }).success).toBe(false);
  });
});
