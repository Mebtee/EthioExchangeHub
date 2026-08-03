import { describe, expect, it } from "vitest";

import { getOffset, getPaginationMeta, parsePagination } from "@/utils/pagination";

describe("parsePagination", () => {
  it("parses valid page/limit", () => {
    expect(parsePagination("2", "25")).toEqual({ page: 2, limit: 25 });
  });

  it("falls back to defaults for invalid or empty values", () => {
    expect(parsePagination(undefined, undefined)).toEqual({ page: 1, limit: 20 });
    expect(parsePagination("abc", "-3")).toEqual({ page: 1, limit: 20 });
    expect(parsePagination("0", "0")).toEqual({ page: 1, limit: 20 });
  });

  it("uses the supplied default limit", () => {
    expect(parsePagination(undefined, undefined, 5)).toEqual({ page: 1, limit: 5 });
  });

  it("clamps the limit to the maximum", () => {
    expect(parsePagination("1", "9999")).toEqual({ page: 1, limit: 100 });
  });
});

describe("getOffset", () => {
  it("computes the SQL offset", () => {
    expect(getOffset(1, 20)).toBe(0);
    expect(getOffset(3, 10)).toBe(20);
  });
});

describe("getPaginationMeta", () => {
  it("computes metadata for multiple pages", () => {
    const meta = getPaginationMeta(45, { page: 2, limit: 20 });
    expect(meta.totalPages).toBe(3);
    expect(meta.hasNextPage).toBe(true);
    expect(meta.hasPrevPage).toBe(true);
  });

  it("handles an empty result set", () => {
    const meta = getPaginationMeta(0, { page: 1, limit: 20 });
    expect(meta.totalPages).toBe(1);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPrevPage).toBe(false);
  });

  it("handles zero limit defensively", () => {
    const meta = getPaginationMeta(5, { page: 1, limit: 0 });
    expect(meta.totalPages).toBe(1);
  });
});
