import { describe, expect, it } from "vitest";

import {
  createManualRateBodySchema,
  manualRateListQuerySchema,
  updateManualRateBodySchema,
} from "@/validators/manual-rates";

const validBody = {
  bank_code: "ABY",
  currency_code: "USD",
  buying_rate: 121.5,
  selling_rate: 122.5,
  transactional_buying: 125.1,
  transactional_selling: 126.2,
  rate_date: "2026-08-02",
};

describe("manualRateListQuerySchema", () => {
  it("accepts empty and valid filters", () => {
    expect(manualRateListQuerySchema.safeParse({}).success).toBe(true);
    expect(
      manualRateListQuerySchema.safeParse({
        bankCode: "ABY",
        currencyCode: "USD",
        rateDate: "2026-08-02",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid filters", () => {
    expect(manualRateListQuerySchema.safeParse({ rateDate: "yesterday" }).success).toBe(false);
    expect(manualRateListQuerySchema.safeParse({ currencyCode: "EURO" }).success).toBe(false);
  });
});

describe("createManualRateBodySchema", () => {
  it("accepts a valid body", () => {
    expect(createManualRateBodySchema.safeParse(validBody).success).toBe(true);
  });

  it("accepts optional note and entered_by", () => {
    const result = createManualRateBodySchema.safeParse({
      ...validBody,
      note: "   ",
      entered_by: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.note).toBeNull();
    }
  });

  it("rejects missing required fields", () => {
    expect(createManualRateBodySchema.safeParse({}).success).toBe(false);
    expect(createManualRateBodySchema.safeParse({ bank_code: "ABY" }).success).toBe(false);
  });

  it("rejects non-positive and non-finite rates", () => {
    expect(createManualRateBodySchema.safeParse({ ...validBody, buying_rate: 0 }).success).toBe(
      false,
    );
    expect(createManualRateBodySchema.safeParse({ ...validBody, selling_rate: -1 }).success).toBe(
      false,
    );
    expect(createManualRateBodySchema.safeParse({ ...validBody, buying_rate: "ten" }).success).toBe(
      false,
    );
  });

  it("accepts null or omitted transactional rates", () => {
    expect(
      createManualRateBodySchema.safeParse({ ...validBody, transactional_buying: null }).success,
    ).toBe(true);
    expect(
      createManualRateBodySchema.safeParse({
        ...validBody,
        transactional_buying: undefined,
        transactional_selling: undefined,
      }).success,
    ).toBe(true);
  });

  it("rejects non-positive transactional rates", () => {
    expect(
      createManualRateBodySchema.safeParse({ ...validBody, transactional_buying: -1 }).success,
    ).toBe(false);
    expect(
      createManualRateBodySchema.safeParse({ ...validBody, transactional_selling: 0 }).success,
    ).toBe(false);
    expect(
      createManualRateBodySchema.safeParse({ ...validBody, transactional_buying: "ten" }).success,
    ).toBe(false);
  });

  it("rejects unknown keys (strict)", () => {
    expect(createManualRateBodySchema.safeParse({ ...validBody, typo_field: 1 }).success).toBe(
      false,
    );
  });
});

describe("updateManualRateBodySchema", () => {
  it("accepts a valid partial update", () => {
    expect(updateManualRateBodySchema.safeParse({ buying_rate: 130 }).success).toBe(true);
    expect(updateManualRateBodySchema.safeParse({ transactional_selling: 130 }).success).toBe(true);
    expect(updateManualRateBodySchema.safeParse({ note: "changed" }).success).toBe(true);
  });

  it("rejects an empty body", () => {
    expect(updateManualRateBodySchema.safeParse({}).success).toBe(false);
  });

  it("rejects unknown keys and invalid values", () => {
    expect(updateManualRateBodySchema.safeParse({ extra: 1 }).success).toBe(false);
    expect(updateManualRateBodySchema.safeParse({ rate_date: "nope" }).success).toBe(false);
    expect(updateManualRateBodySchema.safeParse({ transactional_buying: -3 }).success).toBe(false);
  });
});
