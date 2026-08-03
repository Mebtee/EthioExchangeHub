import { describe, expect, it } from "vitest";

import { ValidationError } from "@/lib/errors";
import {
  assertBankCode,
  assertCurrencyCode,
  assertIsoDate,
  assertPositiveRate,
} from "@/services/helpers/Validation";

describe("assertBankCode", () => {
  it("accepts a non-empty string", () => {
    expect(() => assertBankCode("ABY")).not.toThrow();
  });

  it("throws for empty or non-string values", () => {
    expect(() => assertBankCode("")).toThrow(ValidationError);
    expect(() => assertBankCode("   ")).toThrow(ValidationError);
    expect(() => assertBankCode(42 as never)).toThrow(ValidationError);
  });
});

describe("assertCurrencyCode", () => {
  it("accepts exactly 3 uppercase letters", () => {
    expect(() => assertCurrencyCode("USD")).not.toThrow();
  });

  it("throws for invalid formats", () => {
    expect(() => assertCurrencyCode("usd")).toThrow(ValidationError);
    expect(() => assertCurrencyCode("EURO")).toThrow(ValidationError);
    expect(() => assertCurrencyCode("US")).toThrow(ValidationError);
  });
});

describe("assertIsoDate", () => {
  it("accepts YYYY-MM-DD", () => {
    expect(() => assertIsoDate("2026-08-02")).not.toThrow();
  });

  it("throws for other formats", () => {
    expect(() => assertIsoDate("02-08-2026")).toThrow(ValidationError);
    expect(() => assertIsoDate("2026/08/02")).toThrow(ValidationError);
  });
});

describe("assertPositiveRate", () => {
  it("accepts finite positive numbers", () => {
    expect(() => assertPositiveRate(42.5)).not.toThrow();
  });

  it("throws for zero, negative, non-finite, and non-number values", () => {
    expect(() => assertPositiveRate(0)).toThrow(ValidationError);
    expect(() => assertPositiveRate(-1)).toThrow(ValidationError);
    expect(() => assertPositiveRate(Number.POSITIVE_INFINITY)).toThrow(ValidationError);
    expect(() => assertPositiveRate(Number.NaN)).toThrow(ValidationError);
    expect(() => assertPositiveRate("10" as never)).toThrow(ValidationError);
  });
});
