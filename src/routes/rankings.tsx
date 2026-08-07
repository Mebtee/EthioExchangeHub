import { SiteShell, PageContainer } from "@/components/layout/site-shell";
import { RankingsFilters } from "@/components/rankings/rankings-filters";
import { RankingsTable } from "@/components/rankings/rankings-table";
import { RankingsInsights } from "@/components/rankings/rankings-insights";
import { useRankings } from "@/hooks";
import { rateFieldLabel } from "@/lib/rankings";

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

  return (
    <SiteShell>
      <PageContainer>
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Top Banks — Best {rateFieldLabel(field)} Rates
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Real-time exchange rate rankings across major Ethiopian financial institutions.
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
