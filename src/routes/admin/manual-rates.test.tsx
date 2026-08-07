import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminManualRatesPage from "./manual-rates";

import type { ManualRate, ManualRatePayload } from "@/types/admin";

const createManualRate = vi.fn(async (payload: ManualRatePayload) => {
  void payload;
});
const updateManualRate = vi.fn();
const deleteManualRate = vi.fn();

const manualRates: ManualRate[] = [
  {
    id: "manual-1",
    bankCode: "ABY",
    bankName: "Awash Bank",
    currency: "USD",
    cashBuying: 121.4,
    cashSelling: 122.2,
    transactionBuying: 125.1,
    transactionSelling: 126.2,
    rateDate: "2026-08-02",
    note: null,
    createdAt: "2026-08-02T09:00:00.000Z",
  },
  {
    id: "manual-2",
    bankCode: "CBE",
    bankName: "Commercial Bank of Ethiopia",
    currency: "EUR",
    cashBuying: 139.0,
    cashSelling: 140.0,
    transactionBuying: Number.NaN,
    transactionSelling: Number.NaN,
    rateDate: "2026-08-01",
    note: null,
    createdAt: "2026-08-01T10:00:00.000Z",
  },
];

vi.mock("@/hooks", () => ({
  useBanks: () => ({
    data: [
      { slug: "ABY", name: "Awash Bank" },
      { slug: "CBE", name: "Commercial Bank of Ethiopia" },
    ],
    isLoading: false,
  }),
  useCurrencies: () => ({
    data: [
      { code: "USD", label: "US Dollar", category: "Major" },
      { code: "EUR", label: "Euro", category: "Major" },
    ],
  }),
  useManualRates: () => ({ data: manualRates, isLoading: false, isError: false, error: null }),
  useCreateManualRate: () => ({
    isPending: false,
    mutateAsync: createManualRate,
  }),
  useUpdateManualRate: () => ({
    isPending: false,
    mutateAsync: updateManualRate,
  }),
  useDeleteManualRate: () => ({
    isPending: false,
    mutateAsync: deleteManualRate,
  }),
}));

describe("AdminManualRatesPage", () => {
  beforeEach(() => {
    createManualRate.mockClear();
    updateManualRate.mockClear();
    deleteManualRate.mockClear();
  });

  it("renders all four rate columns in the table", () => {
    render(<AdminManualRatesPage />);

    const table = screen.getByRole("table");
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((h) => h.textContent);

    expect(headers).toEqual(
      expect.arrayContaining(["Cash Buy", "Cash Sell", "Trans. Buy", "Trans. Sell"]),
    );
  });

  it("displays the four values for a rate and an em-dash for null transactional values", () => {
    render(<AdminManualRatesPage />);

    expect(screen.getAllByText("121.4000").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("122.2000").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("125.1000").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("126.2000").length).toBeGreaterThanOrEqual(1);
    // The CBE/EUR row has null transactional rates → rendered as em-dashes.
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  it("submits all four rate values when adding a rate", () => {
    render(<AdminManualRatesPage />);

    fireEvent.click(screen.getByRole("button", { name: "Add rate" }));

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Bank"), {
      target: { value: "ABY" },
    });
    fireEvent.change(within(dialog).getByLabelText("Currency"), {
      target: { value: "USD" },
    });
    fireEvent.change(within(dialog).getByLabelText("Cash buy"), {
      target: { value: "121.5" },
    });
    fireEvent.change(within(dialog).getByLabelText("Cash sell"), {
      target: { value: "122.5" },
    });
    fireEvent.change(within(dialog).getByLabelText("Trans. buy"), {
      target: { value: "125.5" },
    });
    fireEvent.change(within(dialog).getByLabelText("Trans. sell"), {
      target: { value: "126.5" },
    });
    fireEvent.change(within(dialog).getByLabelText("Rate date"), {
      target: { value: "2026-08-03" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add rate" }));

    expect(createManualRate).toHaveBeenCalledTimes(1);
    expect(createManualRate).toHaveBeenCalledWith({
      bank_code: "ABY",
      currency_code: "USD",
      buying_rate: 121.5,
      selling_rate: 122.5,
      transactional_buying: 125.5,
      transactional_selling: 126.5,
      rate_date: "2026-08-03",
      note: null,
    });
  });

  it("submits null transactional values when the fields are left blank", () => {
    render(<AdminManualRatesPage />);

    fireEvent.click(screen.getByRole("button", { name: "Add rate" }));

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Bank"), {
      target: { value: "ABY" },
    });
    fireEvent.change(within(dialog).getByLabelText("Currency"), {
      target: { value: "USD" },
    });
    fireEvent.change(within(dialog).getByLabelText("Cash buy"), {
      target: { value: "121.5" },
    });
    fireEvent.change(within(dialog).getByLabelText("Cash sell"), {
      target: { value: "122.5" },
    });
    fireEvent.change(within(dialog).getByLabelText("Rate date"), {
      target: { value: "2026-08-03" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add rate" }));

    expect(createManualRate).toHaveBeenCalledWith({
      bank_code: "ABY",
      currency_code: "USD",
      buying_rate: 121.5,
      selling_rate: 122.5,
      transactional_buying: null,
      transactional_selling: null,
      rate_date: "2026-08-03",
      note: null,
    });
  });

  it("pre-fills the four rate fields when editing a rate", () => {
    render(<AdminManualRatesPage />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Awash Bank rate" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Cash buy")).toHaveValue(121.4);
    expect(within(dialog).getByLabelText("Cash sell")).toHaveValue(122.2);
    expect(within(dialog).getByLabelText("Trans. buy")).toHaveValue(125.1);
    expect(within(dialog).getByLabelText("Trans. sell")).toHaveValue(126.2);
  });
});
