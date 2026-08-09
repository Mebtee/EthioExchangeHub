import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import BankDetailsPage from "./banks.$slug";

import type { Bank } from "@/types/bank";
import type { ExchangeRate } from "@/types/exchange-rate";

const { bank, rates, currencies } = vi.hoisted(() => ({
  bank: {
    slug: "ABY",
    name: "Abay Bank",
    short: "ABY",
    type: "Private Bank",
    color: "",
    website: "https://www.abaybank.com.et/",
    branches: 546,
    totalAssets: 91_300_000_000,
    totalDeposits: 71_900_000_000,
    totalEmployees: 4_651,
    loanToDepositRatio: 68.43,
    returnOnAsset: 3.28,
    returnOnEquity: 24.58,
    profitBeforeTax: 4_200_000_000,
    profitAfterTax: 3_000_000_000,
    paidUpCapital: 7_000_000_000,
    reserves: 2_400_000_000,
    totalLiabilities: 79_100_000_000,
  } satisfies Bank,
  rates: [
    {
      id: 1,
      bankId: 1,
      bankCode: "ABY",
      bankName: "Abay Bank",
      currency: "USD",
      cashBuying: 161.5,
      cashSelling: 162.5,
      transactionBuying: Number.NaN,
      transactionSelling: Number.NaN,
      rateDate: "2026-08-09",
      source: "scraper",
      stale: false,
      logo: "",
    },
  ] satisfies ExchangeRate[],
  currencies: [{ code: "USD", label: "US Dollar", category: "Major" }],
}));

vi.mock("@/hooks", () => ({
  useBankBySlug: () => ({ data: bank, isLoading: false }),
  useExchangeRates: () => ({
    data: rates,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCurrencies: () => ({ data: currencies }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/banks/ABY"]}>
      <BankDetailsPage />
    </MemoryRouter>,
  );
}

describe("BankDetailsPage", () => {
  it("shows real bank information and a working back link", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { name: /Abay Bank Exchange Rates/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Private Bank").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Back to all banks/i })).toHaveAttribute(
      "href",
      "/banks",
    );
    expect(screen.getByRole("link", { name: /Visit Official Website/i })).toHaveAttribute(
      "href",
      "https://www.abaybank.com.et/",
    );
    expect(screen.getAllByText("546").length).toBeGreaterThan(0);
  });

  it("does not render fabricated or placeholder content", async () => {
    renderPage();
    await screen.findByRole("heading", { name: /Abay Bank Exchange Rates/i });

    expect(screen.queryByText("Premium Member")).not.toBeInTheDocument();
    expect(screen.queryByText("Verified NBE Rates")).not.toBeInTheDocument();
    expect(screen.queryByText("User Rating Summary")).not.toBeInTheDocument();
    expect(screen.queryByText("CSV Export")).not.toBeInTheDocument();
    expect(screen.queryByText("Write a Review")).not.toBeInTheDocument();
    expect(screen.queryAllByText("NaN")).toHaveLength(0);
  });

  it("renders the bank's published exchange rates with em-dashes for missing values", async () => {
    renderPage();

    await screen.findByText("US Dollar");
    expect(screen.getByText("161.5000")).toBeInTheDocument();
    expect(screen.getByText("162.5000")).toBeInTheDocument();
    // Null transactional columns render as an em-dash instead of "NaN".
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("shows the financial health ratios from the backend", async () => {
    renderPage();

    await screen.findByText("Loan to Deposit Ratio");
    expect(screen.getByText("68.43%")).toBeInTheDocument();
    expect(screen.getByText("3.28%")).toBeInTheDocument();
    expect(screen.getByText("24.58%")).toBeInTheDocument();
  });
});
