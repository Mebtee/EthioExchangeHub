import { Link } from "react-router-dom";
import { ShoppingCart, Tag, TrendingUp, CalendarDays } from "lucide-react";
import { useMemo } from "react";
import { useTranslation, Trans } from "react-i18next";

import { SiteShell, PageContainer } from "@/components/layout/site-shell";
import { MarketTicker } from "@/components/home/market-ticker";
import { RateHero } from "@/components/home/rate-hero";
import { LiveRankings } from "@/components/home/live-rankings";
import { CurrencyConverter } from "@/components/home/currency-converter";
import { FinancialNews } from "@/components/home/financial-news";
import {
  filterToLatestBusinessDay,
  getBestRate,
  getLatestBusinessDate,
  getPrimaryCurrency,
} from "@/lib/rankings";
import { formatRateDate } from "@/lib/format";
import { useCurrencies, useExchangeRates, useNews, useLocale } from "@/hooks";
import { Seo } from "@/components/shared/seo";

function HomePage() {
  const { t } = useTranslation();
  const { localize } = useLocale();
  const { data: rates = [], isLoading, isError, error, refetch } = useExchangeRates();
  const { data: currencies = [] } = useCurrencies();
  const { data: news = [] } = useNews();

  const primaryCurrency = useMemo(() => getPrimaryCurrency(rates), [rates]);

  // "Today" is defined as the primary currency's latest business date. Rates
  // from older dates never compete for the hero: only rows published on that
  // day are eligible, so a numerically better but older rate can't win.
  const latestBusinessDate = useMemo(
    () => getLatestBusinessDate(rates, primaryCurrency),
    [rates, primaryCurrency],
  );

  const todayRates = useMemo(
    () => filterToLatestBusinessDay(rates, primaryCurrency),
    [rates, primaryCurrency],
  );

  const bestBuy = useMemo(
    () => getBestRate(todayRates, primaryCurrency, "cashBuying", "max"),
    [todayRates, primaryCurrency],
  );

  const bestSell = useMemo(
    () => getBestRate(todayRates, primaryCurrency, "cashSelling", "min"),
    [todayRates, primaryCurrency],
  );

  const rate = bestBuy?.cashBuying;

  return (
    <SiteShell>
      <Seo title={t("seo.home.title")} description={t("seo.home.description")} />
      <MarketTicker />
      <PageContainer>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {/* Hero */}
          <section>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">
              <Trans
                i18nKey="home.heroTitle"
                components={{ highlight: <span className="text-primary" /> }}
              />
            </h1>
            <p className="mt-5 max-w-lg text-muted-foreground">{t("home.heroDescription")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to={localize("/banks")}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:opacity-90 transition"
              >
                {t("home.compareBanks")} <TrendingUp className="size-4" />
              </Link>
              <Link
                to={localize("/rankings")}
                className="inline-flex items-center gap-2 rounded-2xl border border-primary/40 text-primary px-6 py-3 text-sm font-semibold hover:bg-primary/5 transition"
              >
                {t("common.bankRankings")} <TrendingUp className="size-4" />
              </Link>
              <a
                href="#currency-converter"
                className="inline-flex items-center gap-2 rounded-2xl border border-border/70 text-muted-foreground px-6 py-3 text-sm font-semibold hover:bg-surface-low transition"
              >
                {t("common.currencyConverter")} <ShoppingCart className="size-4" />
              </a>
            </div>
          </section>

          {/* Best rate cards */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t("home.todaysBestRates")}
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-high px-3 py-1 text-xs font-semibold text-muted-foreground">
                <CalendarDays className="size-3.5" />
                {t("common.ratesAsOf", {
                  date: latestBusinessDate ? formatRateDate(latestBusinessDate) : "—",
                })}
              </span>
            </div>
            <RateHero
              icon={<ShoppingCart className="size-5" />}
              label={t("home.bestBuyRate")}
              rate={bestBuy?.cashBuying}
              currency={`ETB/${primaryCurrency || "—"}`}
              bank={bestBuy?.bankName ?? "—"}
              accent="primary"
              stale={bestBuy?.stale}
            />
            <RateHero
              icon={<Tag className="size-5" />}
              label={t("home.bestSellRate")}
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
          <h2 className="text-xl font-bold tracking-tight">{t("home.whatIsTitle")}</h2>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground leading-relaxed">
            <Trans
              i18nKey="home.whatIsIntro"
              components={{
                compareLink: (
                  <Link
                    to={localize("/banks")}
                    className="text-primary font-semibold hover:underline"
                  />
                ),
                rankLink: (
                  <Link
                    to={localize("/rankings")}
                    className="text-primary font-semibold hover:underline"
                  />
                ),
              }}
            />
          </p>
        </section>
      </PageContainer>
    </SiteShell>
  );
}

export default HomePage;
