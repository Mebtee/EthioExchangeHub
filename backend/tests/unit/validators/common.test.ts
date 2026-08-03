import { describe, expect, it } from "vitest";

import {
  bankCodeParamsSchema,
  bankCodeSchema,
  booleanStringSchema,
  currencyCodeSchema,
  dateRangeQuerySchema,
  isoDateSchema,
  nonNegativeIntStringSchema,
  paginationQuerySchema,
  positiveIntStringSchema,
  trimmedStringSchema,
  uuidParamsSchema,
  uuidSchema,
} from "@/validators/common";

describe("trimmedStringSchema", () => {
  it("accepts a non-empty string and trims it", () => {
    expect(trimmedStringSchema.safeParse("  hi  ").success).toBe(true);
    expect(trimmedStringSchema.parse("  hi  ")).toBe("hi");
  });

  it("rejects empty and whitespace-only strings", () => {
    expect(trimmedStringSchema.safeParse("").success).toBe(false);
    expect(trimmedStringSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(trimmedStringSchema.safeParse(42).success).toBe(false);
  });
});

describe("bankCodeSchema", () => {
  it("accepts valid codes", () => {
    expect(bankCodeSchema.safeParse("ABY").success).toBe(true);
  });

  it("rejects empty codes", () => {
    expect(bankCodeSchema.safeParse("").success).toBe(false);
  });
});

describe("currencyCodeSchema", () => {
  it("accepts exactly 3 uppercase letters", () => {
    expect(currencyCodeSchema.safeParse("USD").success).toBe(true);
  });

  it("rejects lowercase, short, and long codes", () => {
    expect(currencyCodeSchema.safeParse("usd").success).toBe(false);
    expect(currencyCodeSchema.safeParse("US").success).toBe(false);
    expect(currencyCodeSchema.safeParse("EURO").success).toBe(false);
  });
});

describe("isoDateSchema", () => {
  it("accepts real calendar dates", () => {
    expect(isoDateSchema.safeParse("2026-08-02").success).toBe(true);
    expect(isoDateSchema.safeParse("2026-02-28").success).toBe(true);
  });

  it("rejects bad formats and impossible dates", () => {
    expect(isoDateSchema.safeParse("2026-13-01").success).toBe(false);
    expect(isoDateSchema.safeParse("2026-02-30").success).toBe(false);
    expect(isoDateSchema.safeParse("08-02-2026").success).toBe(false);
  });
});

describe("uuidSchema", () => {
  it("accepts a valid UUID", () => {
    expect(uuidSchema.safeParse("3fbf920e-2cf7-47d2-95d7-80b29d9a00d7").success).toBe(true);
  });

  it("rejects non-UUID strings", () => {
    expect(uuidSchema.safeParse("not-a-uuid").success).toBe(false);
  });
});

describe("booleanStringSchema", () => {
  it("accepts canonical true/false only", () => {
    expect(booleanStringSchema.safeParse("true").success).toBe(true);
    expect(booleanStringSchema.safeParse("false").success).toBe(true);
    expect(booleanStringSchema.safeParse("TRUE").success).toBe(false);
    expect(booleanStringSchema.safeParse("1").success).toBe(false);
  });
});

describe("pagination string schemas", () => {
  it("positiveIntStringSchema requires >= 1", () => {
    expect(positiveIntStringSchema.safeParse("1").success).toBe(true);
    expect(positiveIntStringSchema.safeParse("0").success).toBe(false);
    expect(positiveIntStringSchema.safeParse("-1").success).toBe(false);
    expect(positiveIntStringSchema.safeParse("abc").success).toBe(false);
  });

  it("nonNegativeIntStringSchema requires >= 0", () => {
    expect(nonNegativeIntStringSchema.safeParse("0").success).toBe(true);
    expect(nonNegativeIntStringSchema.safeParse("5").success).toBe(true);
    expect(nonNegativeIntStringSchema.safeParse("-1").success).toBe(false);
  });
});

describe("dateRangeQuerySchema", () => {
  it("accepts empty and partial ranges", () => {
    expect(dateRangeQuerySchema.safeParse({}).success).toBe(true);
    expect(dateRangeQuerySchema.safeParse({ from: "2026-01-01" }).success).toBe(true);
    expect(dateRangeQuerySchema.safeParse({ to: "2026-08-01" }).success).toBe(true);
  });

  it("rejects invalid dates and strips unknown keys", () => {
    expect(dateRangeQuerySchema.safeParse({ from: "not-a-date" }).success).toBe(false);
    expect(dateRangeQuerySchema.parse({ from: "2026-01-01", extra: "x" })).toEqual({
      from: "2026-01-01",
    });
  });
});

describe("paginationQuerySchema", () => {
  it("accepts valid pagination", () => {
    expect(paginationQuerySchema.safeParse({ limit: "20", offset: "0" }).success).toBe(true);
  });

  it("rejects invalid pagination", () => {
    expect(paginationQuerySchema.safeParse({ limit: "0" }).success).toBe(false);
    expect(paginationQuerySchema.safeParse({ offset: "-2" }).success).toBe(false);
  });
});

describe("param schemas", () => {
  it("bankCodeParamsSchema validates bankCode", () => {
    expect(bankCodeParamsSchema.safeParse({ bankCode: "ABY" }).success).toBe(true);
    expect(bankCodeParamsSchema.safeParse({ bankCode: "" }).success).toBe(false);
  });

  it("uuidParamsSchema validates id", () => {
    expect(uuidParamsSchema.safeParse({ id: "3fbf920e-2cf7-47d2-95d7-80b29d9a00d7" }).success).toBe(
      true,
    );
    expect(uuidParamsSchema.safeParse({ id: "nope" }).success).toBe(false);
  });
});
