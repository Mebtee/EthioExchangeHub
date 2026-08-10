import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Clock, Globe, Lightbulb, MapPin, Users } from "lucide-react";
import { useMemo } from "react";

import { SiteShell, PageContainer } from "@/components/layout/site-shell";
import { BankAvatar } from "@/components/shared/bank-avatar";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/async-states";
import { InfoItem } from "@/components/shared/info-item";
import { Pill } from "@/components/shared/pill";
import { SurfaceCard } from "@/components/shared/surface-card";
import { formatEtbCompact, formatRateDate, formatRateOrDash } from "@/lib/format";
import type { Bank } from "@/types/bank";
import { getLatestBusinessDate, getLatestUpdate, getRatesForBank } from "@/lib/rankings";
import { useBankBySlug, useCurrencies, useExchangeRates } from "@/hooks";
import { JsonLd, Seo } from "@/components/shared/seo";

/** Up to three currency codes in a natural list, e.g. "USD, EUR, GBP, and more". */
function formatCurrencyList(codes: string[]): string {
  const top = codes.slice(0, 3);
  const list = top.length <= 2 ? top.join(" and ") : `${top[0]}, ${top[1]}, and ${top[2]}`;
  return codes.length > top.length ? `${list}, and more` : list;
}

function BankDetails() {
  const { slug } = useParams<{ slug: string }>();
  const { data: bank, isLoading: bankLoading } = useBankBySlug(slug);
  const {
    data: rates = [],
    isLoading: ratesLoading,
    isError: ratesError,
    error,
    refetch: refetchRates,
  } = useExchangeRates();
  const { data: currencies = [] } = useCurrencies();

  /**
   * The bank's CURRENT rates: only rows this bank published on their own
   * currency's latest business date. An older row for a currency is never
   * shown as the current rate — if this bank did not publish on that
   * currency's latest day, that currency row is omitted.
   */
  const bankRates = useMemo(() => {
    if (!bank) return [];
    return getRatesForBank(rates, bank.name).filter(
      (r) => r.rateDate === getLatestBusinessDate(rates, r.currency),
    );
  }, [rates, bank]);

  const latestUpdate = useMemo(() => getLatestUpdate(bankRates), [bankRates]);

  const currencyByCode = useMemo(() => new Map(currencies.map((c) => [c.code, c])), [currencies]);

  const availableCurrencies = useMemo(() => {
    const seen: string[] = [];
    for (const r of bankRates) {
      if (!seen.includes(r.currency)) seen.push(r.currency);
    }
    return seen;
  }, [bankRates]);

  const metaDescription =
    bank && availableCurrencies.length > 0
      ? `Check the latest ${bank.name} exchange rates for ${formatCurrencyList(availableCurrencies)}. Compare buying and selling rates on Ethio Exchange.`
      : `Check the latest ${bank?.name ?? "this bank"} exchange rates and compare buying and selling rates for major currencies on Ethio Exchange.`;

  const breadcrumb = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://ethioexchange.live/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Ethiopian Banks",
          item: "https://ethioexchange.live/banks",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: bank?.name ?? "",
          item: `https://ethioexchange.live/banks/${bank?.slug ?? ""}`,
        },
      ],
    }),
    [bank],
  );

  if (bankLoading) {
    return (
      <SiteShell>
        <PageContainer>
          <LoadingState
            label="Loading bank details…"
            hint="Fetching this bank's profile and rates."
          />
        </PageContainer>
      </SiteShell>
    );
  }

  if (!bank) {
    return (
      <SiteShell>
        <PageContainer>
          <h1 className="text-2xl font-bold">Bank not found</h1>
          <Link
            to="/banks"
            className="mt-4 inline-flex items-center gap-2 text-primary hover:underline"
          >
            <ArrowLeft className="size-4" />
            Back to all banks
          </Link>
        </PageContainer>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <Seo
        title={`${bank.name} Exchange Rate Today — Ethio Exchange`}
        description={metaDescription}
      />
      <JsonLd id="bank-breadcrumbs" data={breadcrumb} />
      <PageContainer>
        <Link
          to="/banks"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to all banks
        </Link>

        {/* Breadcrumb-style contextual navigation */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link to="/" className="hover:text-primary transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to="/banks" className="hover:text-primary transition-colors">
                All Ethiopian Banks
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to="/rankings" className="hover:text-primary transition-colors">
                Bank Rankings
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-semibold text-foreground">
              {bank.name}
            </li>
          </ol>
        </nav>

        {/* Header card */}
        <SurfaceCard className="p-6 flex flex-col md:flex-row gap-6">
          <BankAvatar
            name={bank.name}
            short={bank.short}
            colorClass={bank.color}
            logo={bankRates[0]?.logo}
            className="size-32 rounded-xl text-3xl"
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {bank.name} Exchange Rates
              </h1>
              <span className="rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
                {bank.type}
              </span>
            </div>
            {bank.description && (
              <p className="mt-3 text-sm text-muted-foreground max-w-3xl">{bank.description}</p>
            )}
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <Pill
                icon={<Clock className="size-4 text-muted-foreground" />}
                className="bg-surface-low text-xs"
              >
                Rates as of {latestUpdate ? formatRateDate(latestUpdate) : "—"}
              </Pill>
            </div>
          </div>
        </SurfaceCard>

        {bank && <BankFinancialSnapshot bank={bank} />}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* FX rates table */}
          <SurfaceCard className="p-6">
            <h2 className="text-lg font-semibold mb-5">Foreign Exchange Rates</h2>

            {bankRates.length > 0 && (
              <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                The table lists {bank.name}'s exchange rates for{" "}
                {formatCurrencyList(availableCurrencies)}. The{" "}
                <strong className="font-semibold text-foreground">buying rate</strong> is what the
                bank pays to purchase foreign currency from you, while the{" "}
                <strong className="font-semibold text-foreground">selling rate</strong> is what the
                bank charges to sell foreign currency to you. Rates shown are as of{" "}
                {latestUpdate ? formatRateDate(latestUpdate) : "the latest update"} —{" "}
                <Link to="/rankings" className="text-primary font-semibold hover:underline">
                  compare this bank with others
                </Link>
                , or use the{" "}
                <Link to="/" className="text-primary font-semibold hover:underline">
                  currency converter
                </Link>{" "}
                to convert at the best available rate.
              </p>
            )}

            {ratesLoading ? (
              <LoadingState
                label="Loading exchange rates…"
                hint="Fetching this bank's latest rates from the market service."
              />
            ) : ratesError ? (
              <ErrorState
                title="Unable to load exchange rates"
                message={error instanceof Error ? error.message : undefined}
                onRetry={() => void refetchRates()}
              />
            ) : bankRates.length === 0 ? (
              <EmptyState
                title="No exchange rates available"
                message="This bank has not published rate data yet. Rates will appear here as soon as they are collected."
              />
            ) : (
              <>
                <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] gap-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  <span>Currency</span>
                  <span className="text-right">Cash Buy</span>
                  <span className="text-right">Cash Sell</span>
                  <span className="text-right">Trans. Buy</span>
                  <span className="text-right">Trans. Sell</span>
                </div>
                <ul className="mt-2 divide-y divide-border/60">
                  {bankRates.map((r) => {
                    const meta = currencyByCode.get(r.currency);
                    return (
                      <li
                        key={r.id}
                        className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr] items-center gap-2 px-3 py-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="size-9 rounded bg-surface-high text-[11px] font-bold flex items-center justify-center">
                            {r.currency}
                          </span>
                          <div>
                            <p className="font-semibold text-sm">{meta?.label ?? r.currency}</p>
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                              {meta?.category ?? "—"}
                            </p>
                          </div>
                        </div>
                        <span className="text-right tabular font-semibold">
                          {formatRateOrDash(r.cashBuying)}
                        </span>
                        <span className="text-right tabular font-semibold">
                          {formatRateOrDash(r.cashSelling)}
                        </span>
                        <span className="text-right tabular font-semibold">
                          {formatRateOrDash(r.transactionBuying)}
                        </span>
                        <span className="text-right tabular font-semibold">
                          {formatRateOrDash(r.transactionSelling)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </SurfaceCard>

          {/* Real bank profile details */}
          <section className="space-y-6">
            <SurfaceCard className="p-6">
              <h3 className="text-lg font-semibold mb-4">Bank Details</h3>
              <InfoItem
                icon={<Building2 className="size-4 text-primary" />}
                label="Bank Type"
                value={bank.type}
              />
              <InfoItem
                icon={<MapPin className="size-4 text-primary" />}
                label="Total Branches"
                value={bank.branches ? bank.branches.toLocaleString() : "—"}
              />
              <InfoItem
                icon={<Users className="size-4 text-primary" />}
                label="Total Employees"
                value={bank.totalEmployees ? bank.totalEmployees.toLocaleString() : "—"}
              />
              {bank.website && (
                <a
                  href={bank.website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  <Globe className="size-4" />
                  Visit Official Website
                </a>
              )}
            </SurfaceCard>

            <BankFinancialHealth bank={bank} />

            <div className="rounded-2xl bg-[color:var(--gold-soft)] border border-[color:var(--gold)]/30 p-5">
              <div className="flex items-center gap-2 text-[color:var(--gold-foreground)] font-semibold text-sm">
                <Lightbulb className="size-4" /> Pro Tip
              </div>
              <p className="text-sm text-[color:var(--gold-foreground)]/80 mt-2">
                Check rates during market opening hours (GMT+3) for the most accurate and real-time
                execution prices.
              </p>
            </div>
          </section>
        </div>
      </PageContainer>
    </SiteShell>
  );
}

/**
 * Financial snapshot shown on the bank detail page. Renders only when the bank
 * actually publishes financials; each metric falls back to an em-dash.
 */
function BankFinancialSnapshot({ bank }: { bank: Bank }) {
  const hasFinancials =
    bank.totalAssets !== undefined ||
    bank.totalDeposits !== undefined ||
    bank.totalEmployees !== undefined ||
    bank.profitBeforeTax !== undefined ||
    bank.profitAfterTax !== undefined ||
    bank.paidUpCapital !== undefined ||
    bank.reserves !== undefined ||
    bank.totalLiabilities !== undefined;

  if (!hasFinancials) return null;

  const metrics: { label: string; value: string }[] = [
    { label: "Total Assets", value: formatEtbCompact(bank.totalAssets) },
    { label: "Total Liabilities", value: formatEtbCompact(bank.totalLiabilities) },
    { label: "Total Deposits", value: formatEtbCompact(bank.totalDeposits) },
    { label: "Paid-up Capital", value: formatEtbCompact(bank.paidUpCapital) },
    { label: "Reserves", value: formatEtbCompact(bank.reserves) },
    { label: "Profit Before Tax", value: formatEtbCompact(bank.profitBeforeTax) },
    { label: "Profit After Tax", value: formatEtbCompact(bank.profitAfterTax) },
    { label: "Branches", value: formatEtbCompact(bank.branches) },
    { label: "Employees", value: formatEtbCompact(bank.totalEmployees) },
  ];

  return (
    <SurfaceCard className="p-6 mt-8">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <h2 className="text-lg font-semibold">Financial Snapshot</h2>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Figures in ETB
        </span>
      </div>
      <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl bg-surface-low p-4">
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              {m.label}
            </dt>
            <dd className="mt-1 text-base font-bold tabular">{m.value}</dd>
          </div>
        ))}
      </dl>
    </SurfaceCard>
  );
}

/**
 * Financial health ratios from the bank's published financials. Renders only
 * when at least one ratio exists; the values are already percentages, so they
 * are displayed directly rather than scaled.
 */
function BankFinancialHealth({ bank }: { bank: Bank }) {
  const ratios: { label: string; value?: number }[] = [
    { label: "Loan to Deposit Ratio", value: bank.loanToDepositRatio },
    { label: "Return on Assets", value: bank.returnOnAsset },
    { label: "Return on Equity", value: bank.returnOnEquity },
  ];
  const present = ratios.filter((r) => typeof r.value === "number");
  if (present.length === 0) return null;

  return (
    <SurfaceCard className="p-6">
      <h3 className="text-lg font-semibold">Financial Health</h3>
      <dl className="mt-3 space-y-2.5">
        {present.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 py-2">
            <dt className="text-sm text-muted-foreground">{r.label}</dt>
            <dd className="text-sm font-bold tabular">{r.value?.toFixed(2)}%</dd>
          </div>
        ))}
      </dl>
    </SurfaceCard>
  );
}

export default BankDetails;
