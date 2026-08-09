import { SiteShell, PageContainer } from "@/components/layout/site-shell";
import { RankingsFilters } from "@/components/rankings/rankings-filters";
import { RankingsTable } from "@/components/rankings/rankings-table";
import { RankingsInsights } from "@/components/rankings/rankings-insights";
import { useRankings } from "@/hooks";
import { rateFieldLabel, RATE_FIELDS } from "@/lib/rankings";
import { formatRateDate } from "@/lib/format";
import { Seo } from "@/components/shared/seo";

function RankingsPage() {
  const {
    field,
    setField,
    currency,
    setCurrency,
    currencies,
    query,
    setQuery,
    asOfDate,
    setAsOfDate,
    rankings,
    totalBanks,
    isLoading,
    isError,
    error,
    refetch,
  } = useRankings();

  const fieldMeta = RATE_FIELDS.find((f) => f.key === field);
  const directionNote =
    fieldMeta?.direction === "asc"
      ? "selling rates are ranked lowest first, so the bank at the top sells foreign currency for the least birr"
      : "buying rates are ranked highest first, so the bank at the top buys foreign currency for the most birr";

  return (
    <SiteShell>
      <Seo
        title="Ethiopian Bank Exchange Rate Comparison — Ethio Exchange"
        description="Compare buying and selling exchange rates across Ethiopian banks for USD, EUR, GBP and more. Rank banks by rate, currency and date on Ethio Exchange."
      />
      <PageContainer>
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Ethiopian Bank Exchange Rate Comparison
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Banks are ranked by their{" "}
            <span className="font-semibold text-foreground">{rateFieldLabel(field)}</span> rate for{" "}
            <span className="font-semibold text-foreground">{currency || "all currencies"}</span>,
            using the rates each bank published on{" "}
            <span className="font-semibold text-foreground">
              {asOfDate ? formatRateDate(asOfDate) : "the latest available day"}
            </span>
            . {fieldMeta?.direction === "asc" ? "Selling" : "Buying"} rates are ranked{" "}
            {fieldMeta?.direction === "asc" ? "lowest first" : "highest first"} — {directionNote}.
          </p>
        </div>

        <RankingsFilters
          field={field}
          onFieldChange={setField}
          query={query}
          onQueryChange={setQuery}
          currency={currency}
          currencies={currencies}
          onCurrencyChange={setCurrency}
          asOfDate={asOfDate}
          onAsOfDateChange={setAsOfDate}
        />

        <RankingsTable
          rankings={rankings}
          field={field}
          totalBanks={totalBanks}
          isLoading={isLoading}
          isError={isError}
          errorMessage={error instanceof Error ? error.message : undefined}
          hasFilters={Boolean(query.trim()) || Boolean(currency) || Boolean(asOfDate)}
          asOfDate={asOfDate}
          onRetry={() => void refetch()}
        />

        <RankingsInsights rankings={rankings} field={field} currency={currency} />
      </PageContainer>
    </SiteShell>
  );
}

export default RankingsPage;
