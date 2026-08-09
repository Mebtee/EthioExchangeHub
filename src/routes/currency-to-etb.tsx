import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightLeft, CalendarDays, Info } from "lucide-react";

import { SiteShell, PageContainer } from "@/components/layout/site-shell";
import { BankAvatar } from "@/components/shared/bank-avatar";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/async-states";
import { JsonLd, Seo } from "@/components/shared/seo";
import { SurfaceCard } from "@/components/shared/surface-card";
import { slugifyBankName } from "@/lib/bank";
import { formatAmount, formatRate, formatRateDate } from "@/lib/format";
import { dedupeLatestRates, getBestRate, getLatestUpdate } from "@/lib/rankings";
import { useCurrencies, useExchangeRates } from "@/hooks";

const SITE_URL = "https://ethioexchange.live";

interface CurrencyPageConfig {
  code: string;
  path: string;
  /** Proper noun used in headings — e.g. "United States Dollar". */
  currencyName: string;
  /** Lowercase article form used inside a sentence — e.g. "the US dollar". */
  currencyNameLower: string;
  /** Short origin note used in the explanatory copy. */
  origin: string;
  title: string;
  description: string;
}

const CURRENCY_PAGES: Record<string, CurrencyPageConfig> = {
  USD: {
    code: "USD",
    path: "/usd-to-etb",
    currencyName: "United States Dollar",
    currencyNameLower: "the US dollar",
    origin: "the currency of the United States",
    title: "USD to ETB Exchange Rate Today — US Dollar to Ethiopian Birr",
    description:
      "Convert USD to ETB and check Ethiopian bank exchange rates for the US dollar and Ethiopian birr on Ethio Exchange.",
  },
  EUR: {
    code: "EUR",
    path: "/eur-to-etb",
    currencyName: "Euro",
    currencyNameLower: "the euro",
    origin: "the official currency of the eurozone",
    title: "EUR to ETB Exchange Rate Today — Euro to Ethiopian Birr",
    description:
      "Convert EUR to ETB and check Ethiopian bank exchange rates for the euro and Ethiopian birr on Ethio Exchange.",
  },
  GBP: {
    code: "GBP",
    path: "/gbp-to-etb",
    currencyName: "British Pound Sterling",
    currencyNameLower: "the British pound",
    origin: "the currency of the United Kingdom",
    title: "GBP to ETB Exchange Rate Today — British Pound to Ethiopian Birr",
    description:
      "Convert GBP to ETB and check Ethiopian bank exchange rates for the British pound and Ethiopian birr on Ethio Exchange.",
  },
  SAR: {
    code: "SAR",
    path: "/sar-to-etb",
    currencyName: "Saudi Riyal",
    currencyNameLower: "the Saudi riyal",
    origin: "the currency of Saudi Arabia",
    title: "SAR to ETB Exchange Rate Today — Saudi Riyal to Ethiopian Birr",
    description:
      "Convert SAR to ETB and check Ethiopian bank exchange rates for the Saudi riyal and Ethiopian birr on Ethio Exchange.",
  },
  AED: {
    code: "AED",
    path: "/aed-to-etb",
    currencyName: "UAE Dirham",
    currencyNameLower: "the UAE dirham",
    origin: "the currency of the United Arab Emirates",
    title: "AED to ETB Exchange Rate Today — UAE Dirham to Ethiopian Birr",
    description:
      "Convert AED to ETB and check Ethiopian bank exchange rates for the UAE dirham and Ethiopian birr on Ethio Exchange.",
  },
};

function buildBreadcrumb(config: CurrencyPageConfig) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${SITE_URL}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Exchange Rates",
        item: `${SITE_URL}/rankings`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${config.code} to ETB`,
        item: `${SITE_URL}${config.path}`,
      },
    ],
  };
}

function CurrencyToEtbPage({ currency }: { currency: string }) {
  const config = useMemo<CurrencyPageConfig>(() => {
    const known = CURRENCY_PAGES[currency];
    if (known) return known;
    return {
      code: currency,
      path: `/${currency.toLowerCase()}-to-etb`,
      currencyName: `${currency}`,
      currencyNameLower: `the ${currency} currency`,
      origin: `the ${currency} currency`,
      title: `${currency} to ETB Exchange Rate Today — ${currency} to Ethiopian Birr`,
      description: `Convert ${currency} to ETB and check Ethiopian bank exchange rates on Ethio Exchange.`,
    };
  }, [currency]);

  const { data: rates = [], isLoading, isError, error, refetch } = useExchangeRates();
  const { data: currencies = [] } = useCurrencies();

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

  const breadcrumb = useMemo(() => buildBreadcrumb(config), [config]);

  return (
    <SiteShell>
      <Seo title={config.title} description={config.description} />
      <JsonLd id={`currency-${config.code}`} data={breadcrumb} />

      <PageContainer>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link to="/" className="hover:text-primary transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to="/rankings" className="hover:text-primary transition-colors">
                Exchange Rates
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-semibold text-foreground">
              {config.code} to ETB
            </li>
          </ol>
        </nav>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          {/* Hero */}
          <section>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-[1.1]">
              {config.code} to ETB Exchange Rate
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Live conversion between {config.currencyNameLower} ({config.code}) and the Ethiopian
              birr (ETB), using the latest buying and selling rates published by Ethiopia's
              commercial banks.
            </p>

            <div className="mt-6 rounded-2xl bg-card border border-border/60 p-6">
              {isLoading ? (
                <LoadingState label="Loading rates…" hint="Fetching the latest bank rates." />
              ) : isError ? (
                <ErrorState
                  title="Unable to load exchange rates"
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
                    ETB
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Best cash buying rate available at {bestBuy.bankName}.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-high px-3 py-1 font-semibold">
                      <CalendarDays className="size-3.5" />
                      Rates as of {latestUpdate ? formatRateDate(latestUpdate) : "—"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-high px-3 py-1 font-semibold">
                      <Info className="size-3.5" />
                      Buying rate shown
                    </span>
                  </div>
                </>
              ) : (
                <EmptyState
                  title={`No ${config.code} rates available yet`}
                  message="No bank has published USD rate data yet. Check back once banks report their latest rates."
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
          <h2 className="text-xl font-bold tracking-tight">Ethiopian Bank {config.code} Rates</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Latest {config.code} buying and selling rates published by each bank, as of{" "}
            {latestUpdate ? formatRateDate(latestUpdate) : "the latest update"}.
          </p>

          {isLoading ? (
            <div className="mt-5">
              <LoadingState label="Loading bank rates…" hint="Fetching each bank's latest rates." />
            </div>
          ) : isError ? (
            <div className="mt-5">
              <ErrorState
                title="Unable to load exchange rates"
                message={error instanceof Error ? error.message : undefined}
                onRetry={() => void refetch()}
              />
            </div>
          ) : currencyRates.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                title={`No ${config.code} rates available`}
                message="No bank has published rate data for this currency yet."
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
                    to={`/banks/${r.bankCode ?? slugifyBankName(r.bankName)}`}
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
                      Buy
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular">{formatRate(r.cashSelling)}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Sell
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
            About the {config.code} to ETB exchange rate
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              The {config.currencyName} ({config.code}) is {config.origin}. The ETB is the Ethiopian
              birr, the official currency of Ethiopia. Exchange rates on Ethio Exchange are the
              buying and selling rates published by Ethiopia's commercial banks, shown per unit of
              foreign currency in birr.
            </p>
            <p>
              The <strong className="font-semibold text-foreground">buying rate</strong> is what a
              bank pays to purchase foreign currency from you, so it is the rate that determines how
              many birr you receive when converting {config.currencyNameLower} to ETB. The{" "}
              <strong className="font-semibold text-foreground">selling rate</strong> is what a bank
              charges to sell foreign currency to you, which applies when converting ETB back to{" "}
              {config.code}.
            </p>
            <p>
              Rates are updated from each bank's published figures and reflect the most recent data
              available as of {latestUpdate ? formatRateDate(latestUpdate) : "the latest update"}.
              To convert at the best available rate, use the{" "}
              <Link to="/" className="text-primary font-semibold hover:underline">
                currency converter
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Related links */}
        <nav aria-label="Related pages" className="mt-10">
          <h2 className="text-lg font-bold tracking-tight">Related exchange rate pages</h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            <li>
              <Link
                to="/banks"
                className="inline-flex items-center rounded-xl border border-border/70 bg-card px-4 py-2 text-sm font-semibold text-primary hover:border-primary/40 transition"
              >
                All Ethiopian Banks
              </Link>
            </li>
            <li>
              <Link
                to="/rankings"
                className="inline-flex items-center rounded-xl border border-border/70 bg-card px-4 py-2 text-sm font-semibold text-primary hover:border-primary/40 transition"
              >
                Bank Rankings
              </Link>
            </li>
            <li>
              <Link
                to="/"
                className="inline-flex items-center rounded-xl border border-border/70 bg-card px-4 py-2 text-sm font-semibold text-primary hover:border-primary/40 transition"
              >
                Currency Converter
              </Link>
            </li>
            {otherPairs.map((c) => (
              <li key={c.code}>
                <Link
                  to={c.path}
                  className="inline-flex items-center rounded-xl border border-border/70 bg-card px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition"
                >
                  {c.code} to ETB
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
          <h2 className="text-lg font-bold tracking-tight">{code} ↔ ETB Converter</h2>
          <p className="text-xs text-muted-foreground">Using the best available bank rate</p>
        </div>
      </div>

      <div
        role="group"
        aria-label="Conversion direction"
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
          {code} → ETB
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
          ETB → {code}
        </button>
      </div>

      <label
        htmlFor={`pair-amount-${code}`}
        className="mb-1 block text-xs font-semibold text-muted-foreground"
      >
        Amount
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
            ? `Converted to Ethiopian birr (ETB)`
            : `Converted to ${code}`}
        </p>
        <p className="mt-1 text-2xl font-bold tabular">{result}</p>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Info className="size-3.5 text-primary" />
        Using best {direction === "foreign-to-etb" ? "buying rate" : "selling rate"}:{" "}
        {hasRate ? rate.toFixed(2) : "—"} ETB per {code}
      </p>
    </SurfaceCard>
  );
}

export default CurrencyToEtbPage;
