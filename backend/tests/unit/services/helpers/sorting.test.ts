import { describe, expect, it } from "vitest";

import {
  sortByBankCode,
  sortByBankCodeAndCurrency,
  sortBanksByName,
  sortByRateDate,
  sortLogsNewestFirst,
} from "@/services/helpers/Sorting";

import { banks } from "../../../fixtures/banks";
import { scrapeLogs } from "../../../fixtures/scrape-logs";

describe("sortByRateDate", () => {
  const rows = [{ rate_date: "2026-07-01" }, { rate_date: "2026-08-01" }];

  it("sorts newest first by default", () => {
    expect(sortByRateDate(rows).map((r) => r.rate_date)).toEqual(["2026-08-01", "2026-07-01"]);
  });

  it("sorts oldest first when ascending", () => {
    expect(sortByRateDate(rows, true).map((r) => r.rate_date)).toEqual([
      "2026-07-01",
      "2026-08-01",
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [...rows];
    sortByRateDate(input);
    expect(input.map((r) => r.rate_date)).toEqual(["2026-07-01", "2026-08-01"]);
  });
});

describe("sortBanksByName", () => {
  it("sorts banks alphabetically by name", () => {
    const sorted = sortBanksByName([banks[1]!, banks[0]!]);
    expect(sorted.map((b) => b.bank_code)).toEqual(["ABY", "CBE"]);
  });
});

describe("sortByBankCode", () => {
  it("sorts by bank code alphabetically", () => {
    const sorted = sortByBankCode([{ bank_code: "CBE" }, { bank_code: "ABY" }]);
    expect(sorted.map((r) => r.bank_code)).toEqual(["ABY", "CBE"]);
  });
});

describe("sortByBankCodeAndCurrency", () => {
  it("sorts by bank code then currency code", () => {
    const sorted = sortByBankCodeAndCurrency([
      { bank_code: "ABY", currency_code: "EUR" },
      { bank_code: "CBE", currency_code: "USD" },
      { bank_code: "ABY", currency_code: "USD" },
    ]);
    expect(sorted.map((r) => `${r.bank_code}${r.currency_code}`)).toEqual([
      "ABYEUR",
      "ABYUSD",
      "CBEUSD",
    ]);
  });
});

describe("sortLogsNewestFirst", () => {
  it("sorts by ran_at descending with id tie-break", () => {
    const sorted = sortLogsNewestFirst([scrapeLogs[0]!, scrapeLogs[1]!]);
    expect(sorted[0]?.id).toBe("log-2");
  });

  it("places null timestamps last", () => {
    const sorted = sortLogsNewestFirst([scrapeLogs[3]!, scrapeLogs[0]!]);
    expect(sorted[0]?.id).toBe("log-1");
    expect(sorted[1]?.id).toBe("log-4");
  });

  it("breaks ties by id descending when both timestamps are null", () => {
    const a = { id: "a", ran_at: null };
    const b = { id: "b", ran_at: null };
    expect(sortLogsNewestFirst([a, b]).map((r) => r.id)).toEqual(["b", "a"]);
  });
});
