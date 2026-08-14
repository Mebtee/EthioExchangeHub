import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightLeft, CalendarDays, Info } from "lucide-react";
import { useTranslation, Trans } from "react-i18next";
import type { TFunction } from "i18next";

import { SiteShell, PageContainer } from "@/components/layout/site-shell";
import { BankAvatar } from "@/components/shared/bank-avatar";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/async-states";
import { JsonLd, Seo } from "@/components/shared/seo";
import { SurfaceCard } from "@/components/shared/surface-card";
import { slugifyBankName } from "@/lib/bank";
import { formatAmount, formatRate, formatRateDate } from "@/lib/format";
import { dedupeLatestRates, getBestRate, getLatestUpdate } from "@/lib/rankings";
import { useCurrencies, useExchangeRates, useLocale } from "@/hooks";

const SITE_URL = "https://ethioexchange.live";

interface CurrencyPageConfig {
  code: string;
  path: string;
}

const CURRENCY_PAGES: Record<string, CurrencyPageConfig> = {
  USD: { code: "USD", path: "/usd-to-etb" },
  EUR: { code: "EUR", path: "/eur-to-etb" },
  GBP: { code: "GBP", path: "/gbp-to-etb" },
  SAR: { code: "SAR", path: "/sar-to-etb" },
  AED: { code: "AED", path: "/aed-to-etb" },
};

/** Typed translation keys per known currency page (falls back to USD metadata). */
const CURRENCY_META_KEYS = {
  USD: {
    name: "currencyToEtb.currencies.USD.name",
    nameLower: "currencyToEtb.currencies.USD.nameLower",
    origin: "currencyToEtb.currencies.USD.origin",
  },
  EUR: {
    name: "currencyToEtb.currencies.EUR.name",
    nameLower: "currencyToEtb.currencies.EUR.nameLower",
    origin: "currencyToEtb.currencies.EUR.origin",
  },
  GBP: {
    name: "currencyToEtb.currencies.GBP.name",
    nameLower: "currencyToEtb.currencies.GBP.nameLower",
    origin: "currencyToEtb.currencies.GBP.origin",
  },
  SAR: {
    name: "currencyToEtb.currencies.SAR.name",
    nameLower: "currencyToEtb.currencies.SAR.nameLower",
    origin: "currencyToEtb.currencies.SAR.origin",
  },
  AED: {
    name: "currencyToEtb.currencies.AED.name",
    nameLower: "currencyToEtb.currencies.AED.nameLower",
    origin: "currencyToEtb.currencies.AED.origin",
  },
} as const;

function buildBreadcrumb(config: CurrencyPageConfig, t: TFunction) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: t("common.home"),
        item: `${SITE_URL}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: t("common.exchangeRates"),
        item: `${SITE_URL}/rankings`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: t("currencyToEtb.pairLabel", { code: config.code }),
        item: `${SITE_URL}${config.path}`,
      },
    ],
  };
}

function CurrencyToEtbPage({ currency }: { currency: string }) {
  const { t } = useTranslation();
  const { localize } = useLocale();

  const config = useMemo<CurrencyPageConfig>(() => {
    const known = CURRENCY_PAGES[currency];
    if (known) return known;
    return {
      code: currency,
      path: `/${currency.toLowerCase()}-to-etb`,
    };
  }, [currency]);

  const { data: rates = [], isLoading, isError, error, refetch } = useExchangeRates();
  const { data: currencies = [] } = useCurrencies();

  const metaKeys =
    CURRENCY_META_KEYS[config.code as keyof typeof CURRENCY_META_KEYS] ?? CURRENCY_META_KEYS.USD;
  const currencyName = t(metaKeys.name);
  const currencyNameLower = t(metaKeys.nameLower);
  const origin = t(metaKeys.origin);

  const currencyRates = useMemo(
    () =>
      dedupeLatestRates(rates.filter((r) => r.currency === config.code)).sort(
        (a, b) => b.cashBuying - a.cashBuying,
      ),
    [rates, config.code],
  );

  const bestBuy = useMemo(
    () => getBestRate(rates, config.code, "cashBuying", "max"),
    [rates, config.code],
  );
  const bestSell = useMemo(
    () => getBestRate(rates, config.code, "cashSelling", "min"),
    [rates, config.code],
  );

  const latestUpdate = useMemo(() => getLatestUpdate(currencyRates), [currencyRates]);

  const otherPairs = useMemo(
    () => Object.values(CURRENCY_PAGES).filter((c) => c.code !== config.code),
    [config.code],
  );

  const breadcrumb = useMemo(() => buildBreadcrumb(config, t), [config, t]);

  return (
    <SiteShell>
      <Seo
        title={t("seo.currency.title", { code: config.code, name: currencyName })}
        description={t("seo.currency.description", {
          code: config.code,
          nameLower: currencyNameLower,
        })}
      />
      <JsonLd id={`currency-${config.code}`} data={breadcrumb} />

      <PageContainer>
        {/* Breadcrumb */}
        <nav aria-label={t("currencyToEtb.breadcrumbAria")} className="mb-6">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link to={localize("/")} className="hover:text-primary transition-colors">
                {t("common.home")}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to={localize("/rankings")} className="hover:text-primary transition-colors">
                {t("common.exchangeRates")}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-semibold text-foreground">
              {t("currencyToEtb.pairLabel", { code: config.code })}
            </li>
          </ol>
        </nav>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          {/* Hero */}
          <section>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-[1.1]">
              {t("currencyToEtb.h1", { code: config.code })}
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              {t("currencyToEtb.heroText", { currencyNameLower, code: config.code })}
            </p>

            <div className="mt-6 rounded-2xl bg-card border border-border/60 p-6">
              {isLoading ? (
                <LoadingState label={t("common.loadingRates")} hint={t("common.fetchLatest")} />
              ) : isError ? (
                <ErrorState
                  title={t("liveRankings.unableToLoad")}
                  message={error instanceof Error ? error.message : undefined}
                  onRetry={() => void refetch()}
                />
              ) : bestBuy ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    1 {config.code} ={" "}
                    <span className="text-2xl font-bold text-primary tabular">
                      {bestBuy.cashBuying.toFixed(2)}
                    </span>{" "}
                    ETB{" "}
                    <span className="font-semibold text-foreground">
                      {t("currencyToEtb.bestBankBuyingRate")}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <Trans
                      i18nKey="currencyToEtb.availableAt"
                      values={{ bank: bestBuy.bankName }}
                      components={{ bank: <strong className="font-semibold text-foreground" /> }}
                    />
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-high px-3 py-1 font-semibold">
                      <CalendarDays className="size-3.5" />
                      {t("common.ratesAsOf", {
                        date: latestUpdate ? formatRateDate(latestUpdate) : "—",
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-high px-3 py-1 font-semibold">
                      <Info className="size-3.5" />
                      {t("currencyToEtb.buyingRateShown")}
                    </span>
                  </div>
                </>
              ) : (
                <EmptyState
                  title={t("currencyToEtb.noRatesFor", { code: config.code })}
                  message={t("currencyToEtb.noRatesMessage", { code: config.code })}
                />
              )}
            </div>
          </section>

          {/* Converter */}
          <PairConverter
            code={config.code}
            buying={bestBuy?.cashBuying}
            selling={bestSell?.cashSelling}
          />
        </div>

        {/* Bank rates for this currency */}
        <section className="mt-10">
          <h2 className="text-xl font-bold tracking-tight">
            {t("currencyToEtb.etbBankRates", { code: config.code })}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("currencyToEtb.etbBankRatesHint", {
              code: config.code,
              date: latestUpdate
                ? formatRateDate(latestUpdate)
                : t("currencyToEtb.latestUpdateFallback"),
            })}
          </p>

          {isLoading ? (
            <div className="mt-5">
              <LoadingState label={t("common.loadingRates")} hint={t("common.fetchBankLatest")} />
            </div>
          ) : isError ? (
            <div className="mt-5">
              <ErrorState
                title={t("liveRankings.unableToLoad")}
                message={error instanceof Error ? error.message : undefined}
                onRetry={() => void refetch()}
              />
            </div>
          ) : currencyRates.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                title={t("currencyToEtb.noRates", { code: config.code })}
                message={t("currencyToEtb.noRatesMessageShort")}
              />
            </div>
          ) : (
            <ul className="mt-5 divide-y divide-border/60 rounded-2xl bg-card border border-border/60">
              {currencyRates.map((r) => (
                <li
                  key={r.id}
                  className="grid grid-cols-[minmax(0,1.5fr)_1fr_1fr_0.8fr] items-center gap-3 px-5 py-4"
                >
                  <Link
                    to={localize(`/banks/${r.bankCode ?? slugifyBankName(r.bankName)}`)}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <BankAvatar
                      name={r.bankName}
                      logo={r.logo}
                      className="size-9 rounded-full text-[11px]"
                    />
                    <span className="block truncate text-sm font-semibold hover:text-primary">
                      {r.bankName}
                    </span>
                  </Link>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular text-primary">
                      {formatRate(r.cashBuying)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t("currencyToEtb.buy")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular">{formatRate(r.cashSelling)}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t("currencyToEtb.sell")}
                    </p>
                  </div>
                  <span className="text-right text-xs text-muted-foreground">
                    {formatRateDate(r.rateDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Explanation */}
        <section className="mt-10 rounded-2xl bg-surface-low border border-border/60 p-6 md:p-8">
          <h2 className="text-xl font-bold tracking-tight">
            {t("currencyToEtb.aboutRate", { code: config.code })}
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              {t("currencyToEtb.aboutP1", {
                currencyName,
                code: config.code,
                origin,
              })}
            </p>
            <p>
              <Trans
                i18nKey="currencyToEtb.aboutP2"
                values={{ currencyNameLower, code: config.code }}
                components={{
                  buy: <strong className="font-semibold text-foreground" />,
                  sell: <strong className="font-semibold text-foreground" />,
                }}
              />
            </p>
            <p>
              <Trans
                i18nKey="currencyToEtb.aboutP3"
                values={{
                  date: latestUpdate
                    ? formatRateDate(latestUpdate)
                    : t("currencyToEtb.latestUpdateFallback"),
                }}
                components={{
                  converter: (
                    <Link
                      to={localize("/")}
                      className="text-primary font-semibold hover:underline"
                    />
                  ),
                }}
              />
            </p>
          </div>
        </section>

        {/* Related links */}
        <nav aria-label={t("currencyToEtb.relatedPagesAria")} className="mt-10">
          <h2 className="text-lg font-bold tracking-tight">{t("currencyToEtb.related")}</h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            <li>
              <Link
                to={localize("/banks")}
                className="inline-flex items-center rounded-xl border border-border/70 bg-card px-4 py-2 text-sm font-semibold text-primary hover:border-primary/40 transition"
              >
                {t("common.allEthiopianBanks")}
              </Link>
            </li>
            <li>
              <Link
                to={localize("/rankings")}
                className="inline-flex items-center rounded-xl border border-border/70 bg-card px-4 py-2 text-sm font-semibold text-primary hover:border-primary/40 transition"
              >
                {t("common.bankRankings")}
              </Link>
            </li>
            <li>
              <Link
                to={localize("/")}
                className="inline-flex items-center rounded-xl border border-border/70 bg-card px-4 py-2 text-sm font-semibold text-primary hover:border-primary/40 transition"
              >
                {t("common.currencyConverter")}
              </Link>
            </li>
            {otherPairs.map((c) => (
              <li key={c.code}>
                <Link
                  to={localize(c.path)}
                  className="inline-flex items-center rounded-xl border border-border/70 bg-card px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition"
                >
                  {t("currencyToEtb.pairLabel", { code: c.code })}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </PageContainer>
    </SiteShell>
  );
}

/**
 * Two-way {code} ↔ ETB converter. Uses the best cash buying rate when converting
 * foreign currency to birr and the best cash selling rate when converting back.
 */
function PairConverter({
  code,
  buying,
  selling,
}: {
  code: string;
  buying?: number;
  selling?: number;
}) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(100);
  const [direction, setDirection] = useState<"foreign-to-etb" | "etb-to-foreign">("foreign-to-etb");

  const rate = direction === "foreign-to-etb" ? buying : selling;
  const hasRate = typeof rate === "number" && Number.isFinite(rate);
  const result = hasRate
    ? direction === "foreign-to-etb"
      ? formatAmount(amount * rate)
      : formatAmount(amount / rate)
    : "—";

  return (
    <SurfaceCard className="p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-surface-low text-primary">
          <ArrowRightLeft className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            {t("currencyToEtb.converterTitle", { code })}
          </h2>
          <p className="text-xs text-muted-foreground">{t("currencyToEtb.converterSubtitle")}</p>
        </div>
      </div>

      <div
        role="group"
        aria-label={t("currencyToEtb.conversionDirectionAria")}
        className="mb-4 grid grid-cols-2 gap-1.5 rounded-2xl bg-surface-high/70 p-1.5"
      >
        <button
          type="button"
          onClick={() => setDirection("foreign-to-etb")}
          aria-pressed={direction === "foreign-to-etb"}
          className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
            direction === "foreign-to-etb"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("currencyToEtb.foreignToEtb", { code })}
        </button>
        <button
          type="button"
          onClick={() => setDirection("etb-to-foreign")}
          aria-pressed={direction === "etb-to-foreign"}
          className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
            direction === "etb-to-foreign"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("currencyToEtb.etbToForeign", { code })}
        </button>
      </div>

      <label
        htmlFor={`pair-amount-${code}`}
        className="mb-1 block text-xs font-semibold text-muted-foreground"
      >
        {t("currencyToEtb.amount")}
      </label>
      <input
        id={`pair-amount-${code}`}
        type="number"
        min={0}
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        className="w-full rounded-xl border border-border bg-surface-low px-3 py-2.5 text-sm tabular focus:outline-none focus:ring-2 focus:ring-primary"
      />

      <div className="mt-4 rounded-xl border border-border/70 bg-surface-low px-4 py-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {direction === "foreign-to-etb"
            ? t("currencyToEtb.convertedToEtb")
            : t("currencyToEtb.convertedToCode", { code })}
        </p>
        <p className="mt-1 text-2xl font-bold tabular">{result}</p>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Info className="size-3.5 text-primary" />
        {t("currencyToEtb.usingBestRate", {
          rateType:
            direction === "foreign-to-etb"
              ? t("currencyToEtb.buyingRate")
              : t("currencyToEtb.sellingRate"),
          rate: hasRate ? rate.toFixed(2) : "—",
          code,
        })}
      </p>
    </SurfaceCard>
  );
}

export default CurrencyToEtbPage;
