import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import HomePage from "./index";

import type { ActiveFeatured } from "@/types/featured";
import type { Currency } from "@/types/currency";
import type { ExchangeRate } from "@/types/exchange-rate";
import type { NewsItem } from "@/types/news";

const { rateState, featuredState } = vi.hoisted(() => ({
  rateState: {
    rates: [] as ExchangeRate[],
  },
  featuredState: {
    data: null as ActiveFeatured | null,
  },
}));

function rate(overrides: Partial<ExchangeRate>): ExchangeRate {
  return {
    id: 1,
    bankId: 1,
    bankCode: "A",
    bankName: "Bank A",
    currency: "USD",
    cashBuying: 121.5,
    cashSelling: 122.5,
    transactionBuying: Number.NaN,
    transactionSelling: Number.NaN,
    rateDate: "2026-08-10",
    source: "scraper",
    stale: false,
    logo: "",
    ...overrides,
  };
}

vi.mock("@/hooks", () => ({
  useExchangeRates: () => ({ data: rateState.rates, isLoading: false, isError: false }),
  useCurrencies: () => ({
    data: [{ code: "USD", label: "US Dollar", category: "Major" }] satisfies Currency[],
  }),
  useNews: () => ({ data: [] satisfies NewsItem[] }),
  useLocale: () => ({ locale: "en", localize: (path: string) => path }),
  useFeatured: () => ({ data: featuredState.data }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe("HomePage layout", () => {
  it("renders hero actions, last-updated line, best-rate cards, and the featured campaign", () => {
    featuredState.data = {
      id: "campaign-1",
      title: "Awash Bank — Back-to-School Offer",
      description: "Student account promotions for the new term.",
      image_url: "https://cdn.example.com/awash-school.jpg",
      image_alt: "Awash Bank back-to-school promotion",
      advertiser_name: "Awash Bank",
      badge_text: "FEATURED",
      cta_text: "View Offer",
      destination_url: "/offers/awash-school",
      destination_type: "internal",
      features: [],
    };
    rateState.rates = [
      rate({
        id: 1,
        bankCode: "A",
        bankName: "Bank A",
        rateDate: "2026-08-10",
        cashBuying: 121.5,
        cashSelling: 122.5,
      }),
    ];
    renderPage();

    expect(screen.getByRole("link", { name: /Compare Banks/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Bank Rankings/ })).toBeInTheDocument();
    expect(screen.getByText(/Last updated: Aug 10, 2026/)).toBeInTheDocument();

    expect(screen.getByText("Today's Best Rates")).toBeInTheDocument();
    expect(screen.getByText("Best Buy Rate")).toBeInTheDocument();
    expect(screen.getByText("Best Sell Rate")).toBeInTheDocument();

    expect(screen.getByText("Awash Bank — Back-to-School Offer")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Offer" })).toBeInTheDocument();
  });
});

describe("HomePage best rate", () => {
  it("lets a current-date rate win and never an older numerically better rate (Test 6)", async () => {
    rateState.rates = [
      // Older date, numerically better on both sides — must NOT win.
      rate({
        id: 1,
        bankCode: "B",
        bankName: "Bank B",
        rateDate: "2026-08-09",
        cashBuying: 130,
        cashSelling: 120,
      }),
      // Latest business date — the only eligible rates.
      rate({
        id: 2,
        bankCode: "A",
        bankName: "Bank A",
        rateDate: "2026-08-10",
        cashBuying: 121.5,
        cashSelling: 122.5,
      }),
    ];
    renderPage();

    // The hero's winning bank is the current-date bank on both sides.
    // (The bank name is rendered inside a nested span, so match on textContent.)
    const heroBank = (name: string) => (_content: string, el: Element | null) =>
      el?.textContent === `Available at ${name}`;
    // Both the Best Buy and Best Sell cards show the current-date bank.
    expect(screen.getAllByText(heroBank("Bank A"))).toHaveLength(2);
    expect(screen.queryAllByText(heroBank("Bank B"))).toHaveLength(0);

    // Current-date rates are displayed; the older better rates are not.
    expect(screen.getAllByText(/121.50/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/122.50/).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/130.00/)).toHaveLength(0);
    expect(screen.queryAllByText(/120.00/)).toHaveLength(0);

    // The "As of" date is the latest business date used for the calculation.
    expect(screen.getByText("Rates as of Aug 10, 2026")).toBeInTheDocument();
  });
});
