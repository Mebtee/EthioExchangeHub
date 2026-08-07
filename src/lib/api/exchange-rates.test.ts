import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "./client";
import { fetchExchangeRates, fetchRateDateRange } from "./exchange-rates";

vi.mock("./client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mockGet = vi.mocked(apiClient.get);

const baseRate = {
  id: "rate-1",
  bank_code: "ABY",
  currency_code: "USD",
  buying_rate: 121.5,
  selling_rate: 122.5,
  transactional_buying: null,
  transactional_selling: null,
  weighted_avg_buying: null,
  weighted_avg_selling: null,
  rate_date: "2026-08-04",
  source: "scraper",
  scraped_at: null,
  stale: false,
};

describe("fetchExchangeRates", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("does not send a date param for the latest snapshot", async () => {
    mockGet.mockResolvedValue({ data: [] });

    await fetchExchangeRates();
    await fetchExchangeRates();

    expect(mockGet).toHaveBeenNthCalledWith(1, "/rates/latest", { params: undefined });
    expect(mockGet).toHaveBeenNthCalledWith(2, "/banks");
  });

  it("forwards the as-of date as the to query param", async () => {
    mockGet.mockResolvedValue({ data: [] });

    await fetchExchangeRates(undefined, "2026-08-01");

    expect(mockGet).toHaveBeenCalledWith("/rates/latest", { params: { to: "2026-08-01" } });
  });

  it("still forwards the currency filter when a date is present", async () => {
    mockGet.mockResolvedValue({ data: [] });

    await fetchExchangeRates("USD", "2026-08-01");

    expect(mockGet).toHaveBeenCalledWith("/rates/latest", { params: { to: "2026-08-01" } });
    expect(mockGet).toHaveBeenCalledWith("/banks");
  });

  it("keeps only banks that published a rate on the exact selected date", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: [
          { ...baseRate, id: "1", bank_code: "ABY", rate_date: "2026-08-04" },
          { ...baseRate, id: "2", bank_code: "CBE", rate_date: "2026-08-03" },
        ],
      })
      .mockResolvedValueOnce({ data: [] });

    const result = await fetchExchangeRates(undefined, "2026-08-04");

    expect(result.map((rate) => rate.bankCode)).toEqual(["ABY"]);
  });

  it("returns no banks when none published on the selected date", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: [{ ...baseRate, id: "1", bank_code: "ABY", rate_date: "2026-08-03" }],
      })
      .mockResolvedValueOnce({ data: [] });

    const result = await fetchExchangeRates(undefined, "2026-08-04");

    expect(result).toEqual([]);
  });
});

describe("fetchRateDateRange", () => {
  it("returns the range from /rates/date-range", async () => {
    mockGet.mockResolvedValue({ data: { min: "2026-07-01", max: "2026-08-02" } });

    await expect(fetchRateDateRange()).resolves.toEqual({
      min: "2026-07-01",
      max: "2026-08-02",
    });
    expect(mockGet).toHaveBeenCalledWith("/rates/date-range");
  });
});
