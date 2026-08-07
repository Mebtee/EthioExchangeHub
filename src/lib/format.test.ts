import { describe, expect, it } from "vitest";

import {
  formatAmount,
  formatDurationMs,
  formatEtbCompact,
  formatPercent,
  formatRate,
  formatRateDate,
  formatRateOrDash,
  formatRelativeTime,
} from "./format";

describe("formatRelativeTime", () => {
  it("renders just now for fresh timestamps", () => {
    expect(formatRelativeTime(new Date(Date.now() - 10_000).toISOString())).toBe("Just now");
  });

  it("renders minutes, hours, and days", () => {
    const minutes = new Date(Date.now() - 5 * 60_000).toISOString();
    const hours = new Date(Date.now() - 2 * 3_600_000).toISOString();
    const days = new Date(Date.now() - 3 * 86_400_000).toISOString();
    expect(formatRelativeTime(minutes)).toBe("5 mins ago");
    expect(formatRelativeTime(hours)).toBe("2 hours ago");
    expect(formatRelativeTime(days)).toBe("3 days ago");
  });

  it("returns an em-dash for an unparseable timestamp", () => {
    expect(formatRelativeTime("not-a-date")).toBe("—");
  });
});

describe("formatRateDate", () => {
  it("renders an ISO business date as a readable date", () => {
    expect(formatRateDate("2026-08-05")).toBe("Aug 5, 2026");
  });

  it("returns an em-dash for an unparseable date", () => {
    expect(formatRateDate("not-a-date")).toBe("—");
  });
});

describe("rate formatting", () => {
  it("formats to four decimals and falls back to an em-dash", () => {
    expect(formatRate(121.5)).toBe("121.5000");
    expect(formatRateOrDash(121.5)).toBe("121.5000");
    expect(formatRateOrDash(Number.NaN)).toBe("—");
    expect(formatRateOrDash(null)).toBe("—");
  });
});

describe("amount/duration formatting", () => {
  it("formats amounts with two decimals", () => {
    const formatted = formatAmount(1234.5);
    // Grouping/decimal separators depend on the runtime locale — compare the
    // digit sequence ("1,234.50" / "1 234,50" → "123450") so the test is
    // portable across locales.
    expect(formatted.replace(/\D/g, "")).toBe("123450");
  });

  it("formats durations as seconds and hides missing values", () => {
    expect(formatDurationMs(1500)).toBe("1.5s");
    expect(formatDurationMs(0)).toBe("—");
    expect(formatDurationMs(null)).toBe("—");
  });
});

describe("formatEtbCompact", () => {
  it("compresses large ETB figures into readable units", () => {
    expect(formatEtbCompact(91_300_000_000)).toBe("91.3B");
    expect(formatEtbCompact(7_000_000_000)).toBe("7B");
    expect(formatEtbCompact(3_000_000)).toBe("3M");
    expect(formatEtbCompact(4_651)).toBe("4.7K");
  });

  it("renders plain values below one thousand and hides missing values", () => {
    expect(formatEtbCompact(546)).toBe("546");
    expect(formatEtbCompact(null)).toBe("—");
    expect(formatEtbCompact(undefined)).toBe("—");
  });
});

describe("formatPercent", () => {
  it("renders a decimal ratio as a percentage", () => {
    expect(formatPercent(0.0328)).toBe("3.28%");
    expect(formatPercent(0.6843)).toBe("68.43%");
    expect(formatPercent(null)).toBe("—");
  });
});
