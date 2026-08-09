import { Link } from "react-router-dom";
import { ShoppingCart, Tag, TrendingUp, CalendarDays } from "lucide-react";
import { useMemo } from "react";

import { SiteShell, PageContainer } from "@/components/layout/site-shell";
import { MarketTicker } from "@/components/home/market-ticker";
import { RateHero } from "@/components/home/rate-hero";
import { LiveRankings } from "@/components/home/live-rankings";
import { CurrencyConverter } from "@/components/home/currency-converter";
import { FinancialNews } from "@/components/home/financial-news";
import { getBestRate, getLatestUpdate, getPrimaryCurrency } from "@/lib/rankings";
import { formatRateDate } from "@/lib/format";
import { useCurrencies, useExchangeRates, useNews } from "@/hooks";
import { Seo } from "@/components/shared/seo";

function HomePage() {
  const { data: rates = [], isLoading, isError, error, refetch } = useExchangeRates();
  const { data: currencies = [] } = useCurrencies();
  const { data: news = [] } = useNews();

  const primaryCurrency = useMemo(() => getPrimaryCurrency(rates), [rates]);

  // D2: the hero prefers fresh rates — stale rows are never silently shown as
  // "best". When no fresh rate exists for the primary currency, it falls back
  // to the best available (possibly stale) rate and flags it on the card.
  const freshRates = useMemo(() => rates.filter((r) => !r.stale), [rates]);

  const bestBuy = useMemo(
    () =>
      getBestRate(freshRates, primaryCurrency, "cashBuying", "max") ??
      getBestRate(rates, primaryCurrency, "cashBuying", "max"),
    [freshRates, rates, primaryCurrency],
  );

  const bestSell = useMemo(
    () =>
      getBestRate(freshRates, primaryCurrency, "cashSelling", "min") ??
      getBestRate(rates, primaryCurrency, "cashSelling", "min"),
    [freshRates, rates, primaryCurrency],
  );

  const latestUpdate = useMemo(() => getLatestUpdate(rates), [rates]);

  const rate = bestBuy?.cashBuying;

  return (
    <SiteShell>
      <Seo
        title="Ethio Exchange — Ethiopian Bank Exchange Rates & Currency Converter"
        description="Compare live buying and selling exchange rates for USD, EUR, GBP and more from Ethiopia's commercial banks — updated in real time. Use our free currency converter and rate rankings."
      />
      <MarketTicker />
      <PageContainer>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {/* Hero */}
          <section>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">
              Ethiopian Bank Exchange Rates &amp;{" "}
              <span className="text-primary">Currency Converter</span>
            </h1>
            <p className="mt-5 max-w-lg text-muted-foreground">
              Ethio Exchange compares live buying and selling exchange rates from Ethiopia's
              commercial banks for major foreign currencies including USD, EUR and GBP. Convert
              foreign currency to Ethiopian birr (ETB) and see which bank offers the most
              competitive rate — all updated in real time.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/banks"
                className="inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:opacity-90 transition"
              >
                Compare Banks <TrendingUp className="size-4" />
              </Link>
              <Link
                to="/rankings"
                className="inline-flex items-center gap-2 rounded-2xl border border-primary/40 text-primary px-6 py-3 text-sm font-semibold hover:bg-primary/5 transition"
              >
                Bank Rankings <TrendingUp className="size-4" />
              </Link>
              <a
                href="#currency-converter"
                className="inline-flex items-center gap-2 rounded-2xl border border-border/70 text-muted-foreground px-6 py-3 text-sm font-semibold hover:bg-surface-low transition"
              >
                Currency Converter <ShoppingCart className="size-4" />
              </a>
            </div>
          </section>

          {/* Best rate cards */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Today's Best Rates
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-high px-3 py-1 text-xs font-semibold text-muted-foreground">
                <CalendarDays className="size-3.5" />
                As of {latestUpdate ? formatRateDate(latestUpdate) : "—"}
              </span>
            </div>
            <RateHero
              icon={<ShoppingCart className="size-5" />}
              label="Best Buy Rate"
              rate={bestBuy?.cashBuying}
              currency={`ETB/${primaryCurrency || "—"}`}
              bank={bestBuy?.bankName ?? "—"}
              accent="primary"
              stale={bestBuy?.stale}
            />
            <RateHero
              icon={<Tag className="size-5" />}
              label="Best Sell Rate"
              rate={bestSell?.cashSelling}
              currency={`ETB/${primaryCurrency || "—"}`}
              bank={bestSell?.bankName ?? "—"}
              accent="gold"
              stale={bestSell?.stale}
            />
          </section>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
          {/* Live rankings */}
          <LiveRankings
            rates={rates}
            isLoading={isLoading}
            isError={isError}
            errorMessage={error instanceof Error ? error.message : undefined}
            onRetry={() => void refetch()}
          />

          {/* Converter + news */}
          <section id="currency-converter" className="space-y-6">
            <CurrencyConverter currencies={currencies} bestBuyRate={rate} />
            <FinancialNews items={news} />
          </section>
        </div>

        <section className="mt-12 rounded-2xl bg-surface-low border border-border/60 p-6 md:p-8">
          <h2 className="text-xl font-bold tracking-tight">What is Ethio Exchange?</h2>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground leading-relaxed">
            Ethio Exchange tracks the foreign exchange rates published by Ethiopia's commercial
            banks. You can{" "}
            <Link to="/banks" className="text-primary font-semibold hover:underline">
              compare bank exchange rates
            </Link>{" "}
            side by side,{" "}
            <Link to="/rankings" className="text-primary font-semibold hover:underline">
              rank banks by their buying or selling rate
            </Link>{" "}
            for a given currency and day, and convert between major foreign currencies and the
            Ethiopian birr (ETB) using the latest available bank data. Whether you are sending money
            home, travelling, or planning a transfer, you can quickly see which bank offers the most
            competitive rate for the US dollar, euro, British pound and other major currencies.
          </p>
        </section>
      </PageContainer>
    </SiteShell>
  );
}

export default HomePage;
