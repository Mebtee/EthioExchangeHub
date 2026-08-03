import { describe, expect, it, vi } from "vitest";

import { formatDate, formatDateTime, isWithinLast, nowIso, parseIso } from "@/utils/date";

describe("nowIso", () => {
  it("returns an ISO-8601 UTC string", () => {
    expect(nowIso()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe("parseIso", () => {
  it("parses a valid ISO string", () => {
    expect(parseIso("2026-08-01T00:00:00.000Z")?.getUTCFullYear()).toBe(2026);
  });

  it("returns null for an invalid string", () => {
    expect(parseIso("not-a-date")).toBeNull();
    expect(parseIso("")).toBeNull();
  });
});

describe("formatDate", () => {
  it("formats a valid date", () => {
    expect(formatDate("2026-08-01T00:00:00.000Z")).not.toBe("—");
  });

  it("returns the fallback dash for invalid input", () => {
    expect(formatDate("garbage")).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("formats a valid date with time", () => {
    expect(formatDateTime("2026-08-01T10:30:00.000Z")).not.toBe("—");
  });

  it("returns the fallback dash for invalid input", () => {
    expect(formatDateTime("garbage")).toBe("—");
  });
});

describe("isWithinLast", () => {
  it("is true for a recent timestamp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-02T12:00:00.000Z"));
    expect(isWithinLast("2026-08-02T11:59:00.000Z", 60_000)).toBe(true);
    expect(isWithinLast("2026-08-02T11:58:00.000Z", 60_000)).toBe(false);
    vi.useRealTimers();
  });

  it("is false for invalid input", () => {
    expect(isWithinLast("garbage", 60_000)).toBe(false);
  });
});
