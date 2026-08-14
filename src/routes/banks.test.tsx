import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import BanksPage from "./banks";

import type { Bank } from "@/types/bank";
import type { ExchangeRate } from "@/types/exchange-rate";

const { bankState, rateState } = vi.hoisted(() => ({
  bankState: {
    banks: [] as Bank[],
  },
  rateState: {
    rates: [] as ExchangeRate[],
  },
}));

function bank(slug: string, name: string): Bank {
  return { slug, name, short: slug, type: "Private Bank", color: "" };
}

function rate(bankCode: string, bankName: string, rateDate: string, id: number): ExchangeRate {
  return {
    id,
    bankId: id,
    bankCode,
    bankName,
    currency: "USD",
    cashBuying: 121.5,
    cashSelling: 122.5,
    transactionBuying: Number.NaN,
    transactionSelling: Number.NaN,
    rateDate,
    source: "scraper",
    stale: false,
    logo: "",
  };
}

vi.mock("@/hooks", () => ({
  useBanks: () => ({ data: bankState.banks, isLoading: false, isError: false, refetch: vi.fn() }),
  useExchangeRates: () => ({
    data: rateState.rates,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useLocale: () => ({ locale: "en", localize: (path: string) => path }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <BanksPage />
    </MemoryRouter>,
  );
}

describe("BanksPage current-rate listing", () => {
  it("shows only banks that published on the currency's latest business date", () => {
    bankState.banks = [
      bank("A", "Bank A"),
      bank("B", "Bank B"),
      bank("C", "Bank C"),
      bank("D", "Bank D"),
    ];
    rateState.rates = [
      rate("A", "Bank A", "2026-08-10", 1),
      rate("B", "Bank B", "2026-08-10", 2),
      // Older dates — must not be displayed as current rates.
      rate("C", "Bank C", "2026-08-09", 3),
    ];
    renderPage();

    expect(screen.getByText("Bank A")).toBeInTheDocument();
    expect(screen.getByText("Bank B")).toBeInTheDocument();
    expect(screen.queryByText("Bank C")).not.toBeInTheDocument();
    expect(screen.queryByText("Bank D")).not.toBeInTheDocument();
    expect(
      screen.getByText(/2 commercial banks reporting live USD\/ETB rates/),
    ).toBeInTheDocument();
  });

  it("moves automatically to tomorrow's date when the API supplies newer rates", () => {
    bankState.banks = [
      bank("A", "Bank A"),
      bank("B", "Bank B"),
      bank("C", "Bank C"),
      bank("D", "Bank D"),
    ];
    rateState.rates = [
      // Newest day — these banks are current now.
      rate("A", "Bank A", "2026-08-11", 1),
      rate("B", "Bank B", "2026-08-11", 2),
      // Yesterday — no longer current.
      rate("C", "Bank C", "2026-08-10", 3),
    ];
    renderPage();

    expect(screen.getByText("Bank A")).toBeInTheDocument();
    expect(screen.getByText("Bank B")).toBeInTheDocument();
    expect(screen.queryByText("Bank C")).not.toBeInTheDocument();
  });
});
