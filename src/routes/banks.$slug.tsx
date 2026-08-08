import { Link, useParams } from "react-router-dom";
import {
  BadgeCheck,
  Clock,
  Download,
  Globe,
  Phone,
  Mail,
  MapPin,
  Star,
  Smartphone,
  Lightbulb,
} from "lucide-react";
import { useMemo } from "react";

import { SiteShell, PageContainer } from "@/components/layout/site-shell";
import { BankAvatar } from "@/components/shared/bank-avatar";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/async-states";
import { InfoItem } from "@/components/shared/info-item";
import { Pill } from "@/components/shared/pill";
import { SurfaceCard } from "@/components/shared/surface-card";
import { formatEtbCompact, formatPercent, formatRate, formatRateDate } from "@/lib/format";
import type { Bank } from "@/types/bank";
import { getLatestUpdate, getRatesForBank } from "@/lib/rankings";
import { useBankBySlug, useCurrencies, useExchangeRates } from "@/hooks";

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

  const bankRates = useMemo(() => (bank ? getRatesForBank(rates, bank.name) : []), [rates, bank]);

  const latestUpdate = useMemo(() => getLatestUpdate(bankRates), [bankRates]);

  const currencyByCode = useMemo(() => new Map(currencies.map((c) => [c.code, c])), [currencies]);

  if (bankLoading) {
    return (
      <SiteShell>
        <PageContainer>{null}</PageContainer>
      </SiteShell>
    );
  }

  if (!bank) {
    return (
      <SiteShell>
        <PageContainer>
          <h1 className="text-2xl font-bold">Bank not found</h1>
          <Link to="/banks" className="text-primary hover:underline">
            Back to banks
          </Link>
        </PageContainer>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <PageContainer>
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
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{bank.name}</h1>
              <span className="rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
                Premium Member
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground max-w-3xl">{bank.description}</p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <Pill
                icon={<BadgeCheck className="size-4 text-primary" />}
                className="bg-surface-low text-xs"
              >
                Verified NBE Rates
              </Pill>
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
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Foreign Exchange Rates</h2>
              <button className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                <Download className="size-4" /> CSV Export
              </button>
            </div>

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
                <div className="grid grid-cols-[1.2fr_1fr_1fr_90px] gap-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  <span>Currency</span>
                  <span className="text-right">Buy (ETB)</span>
                  <span className="text-right">Sell (ETB)</span>
                  <span className="text-right">24h</span>
                </div>
                <ul className="mt-2 divide-y divide-border/60">
                  {bankRates.map((r) => {
                    const meta = currencyByCode.get(r.currency);
                    return (
                      <li
                        key={r.id}
                        className="grid grid-cols-[1.2fr_1fr_1fr_90px] items-center gap-2 px-3 py-4"
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
                          {formatRate(r.cashBuying)}
                        </span>
                        <span className="text-right tabular font-semibold">
                          {formatRate(r.cashSelling)}
                        </span>
                        <span className="text-right text-sm font-semibold text-muted-foreground">
                          —
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </SurfaceCard>

          {/* Contact + rating */}
          <section className="space-y-6">
            <SurfaceCard className="p-6">
              <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
              <InfoItem
                icon={<Phone className="size-4 text-primary" />}
                label="Customer Support"
                value={bank.phone ?? "—"}
              />
              <InfoItem
                icon={<Mail className="size-4 text-primary" />}
                label="Email Address"
                value={bank.email ?? "—"}
              />
              <InfoItem
                icon={<MapPin className="size-4 text-primary" />}
                label="Headquarters"
                value={bank.hq ?? "—"}
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

            <SurfaceCard className="p-6">
              <h3 className="text-lg font-semibold">User Rating Summary</h3>
              <div className="flex items-end gap-3 mt-3">
                <span className="text-4xl font-bold tabular text-[color:var(--gold-foreground)]">
                  {bank.rating?.toFixed(1)}
                </span>
                <div>
                  <div className="flex text-[color:var(--gold)]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`size-4 ${i < Math.round(bank.rating ?? 0) ? "fill-current" : ""}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on {bank.reviews?.toLocaleString()} reviews
                  </p>
                </div>
              </div>
              <button className="mt-5 w-full rounded-xl border border-primary/40 text-primary py-2.5 text-sm font-semibold hover:bg-primary/5">
                Write a Review
              </button>
            </SurfaceCard>

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

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <SurfaceCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Branch Locations</h3>
              <Link to="/banks" className="text-sm font-semibold text-primary hover:underline">
                View All
              </Link>
            </div>
            <div className="rounded-xl h-44 bg-[linear-gradient(135deg,#e7e8e9_0%,#f3f4f5_100%)] flex items-end p-4">
              <span className="inline-flex items-center gap-2 text-xs font-semibold bg-card rounded-full px-3 py-1.5 shadow">
                <MapPin className="size-3.5 text-primary" />{" "}
                {bank.branches ? `${bank.branches}+ Branches Nationwide` : "Branches Nationwide"}
              </span>
            </div>
          </SurfaceCard>
          <div className="rounded-2xl bg-primary text-primary-foreground p-6">
            <h3 className="text-lg font-semibold mb-2">Digital Banking</h3>
            <p className="text-sm text-primary-foreground/80">
              Experience seamless foreign currency applications and swift transfers via our{" "}
              {bank.short} mobile app.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <StoreBtn label="App Store" />
              <StoreBtn label="Google Play" />
            </div>
          </div>
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
        <h2 className="text-lg font-semibold">
          Financial Snapshot <span className="text-lg font-semibold">for 2025</span>
        </h2>
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

function StoreBtn({ label }: { label: string }) {
  return (
    <button className="inline-flex items-center gap-2 rounded-xl bg-primary-foreground/10 border border-primary-foreground/20 px-3 py-2.5 text-sm hover:bg-primary-foreground/15 transition">
      <Smartphone className="size-4" />
      <span className="text-left">
        <span className="block text-[10px] uppercase tracking-wider opacity-80">Download on</span>
        <span className="block font-semibold">{label}</span>
      </span>
    </button>
  );
}

export default BankDetails;
