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
      <MarketTicker />
      <PageContainer>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {/* Hero */}
          <section>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">
              <span className="text-primary">Secure Your Wealth</span> with
              <br />
              <span className="text-[color:var(--gold-foreground)]">Precision Rates</span>
            </h1>
            <p className="mt-5 max-w-lg text-muted-foreground">
              Ethiopia's most trusted real-time banking aggregator. Compare official exchange rates
              from all commercial banks and maximize your currency value today.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/banks"
                className="inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:opacity-90 transition"
              >
                Compare Banks <TrendingUp className="size-4" />
              </Link>
              <Link
                to="/news"
                className="inline-flex items-center rounded-2xl border border-primary/40 text-primary px-6 py-3 text-sm font-semibold hover:bg-primary/5 transition"
              >
                Daily News
              </Link>
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
          <section className="space-y-6">
            <CurrencyConverter currencies={currencies} bestBuyRate={rate} />
            <FinancialNews items={news} />
          </section>
        </div>
      </PageContainer>
    </SiteShell>
  );
}

export default HomePage;
