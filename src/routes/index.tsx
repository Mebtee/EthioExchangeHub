import { Link } from "react-router-dom";
import { ShoppingCart, Tag, TrendingUp, RefreshCw } from "lucide-react";
import { useMemo } from "react";

import { SiteShell, PageContainer } from "@/components/layout/site-shell";
import { MarketTicker } from "@/components/home/market-ticker";
import { RateHero } from "@/components/home/rate-hero";
import { LiveRankings } from "@/components/home/live-rankings";
import { CurrencyConverter } from "@/components/home/currency-converter";
import { FinancialNews } from "@/components/home/financial-news";
import { useBanks, useCurrencies, useNews } from "@/hooks";

function Index() {
  const { data: banks = [] } = useBanks();
  const { data: currencies = [] } = useCurrencies();
  const { data: news = [] } = useNews();

  const top5 = useMemo(() => [...banks].sort((a, b) => b.buy - a.buy).slice(0, 5), [banks]);
  const bestBuy = top5[0];
  const bestSell = [...banks].sort((a, b) => a.sell - b.sell)[0];

  const rate = bestBuy?.buy ?? 0;

  return (
    <SiteShell>
      <MarketTicker />
      <PageContainer>
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
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
            <p className="mt-5 text-xs text-muted-foreground flex items-center gap-2">
              <RefreshCw className="size-3" /> Last Updated:{" "}
              <span className="font-semibold text-foreground">Oct 24, 2024 — 14:30 GMT+3</span>
            </p>
          </section>

          {/* Best rate cards */}
          <section className="space-y-4">
            <RateHero
              icon={<ShoppingCart className="size-5" />}
              label="Best Buy Rate"
              rate={bestBuy?.buy ?? 0}
              currency={`ETB/USD`}
              bank={bestBuy?.name ?? "—"}
              accent="primary"
            />
            <RateHero
              icon={<Tag className="size-5" />}
              label="Best Sell Rate"
              rate={bestSell?.sell ?? 0}
              currency="ETB/USD"
              bank={bestSell?.name ?? "—"}
              accent="gold"
            />
          </section>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Live rankings */}
          <LiveRankings banks={banks} />

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

export default Index;
