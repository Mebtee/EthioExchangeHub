import { useMemo, useState } from "react";

import { BankCard } from "@/components/banks/bank-card";
import { SiteShell, PageContainer } from "@/components/layout/site-shell";
import { EmptyState, ErrorState } from "@/components/shared/async-states";
import { CardGridSkeleton } from "@/components/shared/skeletons";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { dedupeLatestRates, getPrimaryCurrency } from "@/lib/rankings";
import { useBanks, useExchangeRates } from "@/hooks";
import { Seo } from "@/components/shared/seo";

function key(bankName: string): string {
  return bankName.trim().toLowerCase();
}

function BanksPage() {
  const {
    data: banks = [],
    isLoading: banksLoading,
    isError: banksError,
    refetch: refetchBanks,
  } = useBanks();
  const {
    data: rates = [],
    isLoading: ratesLoading,
    isError: ratesError,
    error,
    refetch: refetchRates,
  } = useExchangeRates();

  const primaryCurrency = useMemo(() => getPrimaryCurrency(rates), [rates]);

  /** Banks that have published a rate for the primary currency, with their newest record. */
  const bankEntries = useMemo(() => {
    // Reuses the shared newest-per-bank+currency dedupe from lib/rankings.
    const latestByBank = dedupeLatestRates(rates.filter((r) => r.currency === primaryCurrency));
    const rateByBank = new Map(latestByBank.map((r) => [key(r.bankName), r]));
    return banks
      .filter((b) => rateByBank.has(key(b.name)))
      .map((bank) => ({ bank, rate: rateByBank.get(key(bank.name))! }));
  }, [banks, rates, primaryCurrency]);

  const [query, setQuery] = useState("");

  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bankEntries;
    return bankEntries.filter(({ bank }) => bank.name.toLowerCase().includes(q));
  }, [bankEntries, query]);

  const isLoading = banksLoading || ratesLoading;
  const isError = banksError || ratesError;
  const onRetry = () => {
    void refetchBanks();
    void refetchRates();
  };

  return (
    <SiteShell>
      <Seo
        title="Ethiopian Banks Exchange Rates — Ethio Exchange"
        description="Compare buying and selling exchange rates from Ethiopia's commercial banks for USD, EUR, GBP and more — updated in real time on Ethio Exchange."
      />
      <PageContainer>
        <PageHeader
          title="Ethiopian Bank Exchange Rates"
          description={
            isLoading
              ? "Loading commercial bank rates…"
              : primaryCurrency
                ? `${bankEntries.length} commercial banks reporting live ${primaryCurrency}/ETB rates. Compare buying and selling rates across Ethiopia's banks, or search for a specific bank below.`
                : "No bank rates available yet."
          }
          action={
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search bank name..."
              wrapperClassName="w-full sm:w-72"
            />
          }
        />

        {isLoading ? (
          <CardGridSkeleton count={6} />
        ) : isError ? (
          <ErrorState
            title="Unable to load bank directory"
            message={
              error instanceof Error ? error.message : "Something went wrong while loading banks."
            }
            onRetry={onRetry}
          />
        ) : bankEntries.length === 0 ? (
          <EmptyState
            title="No bank rates available"
            message="No bank has published rate data yet. Banks will appear here as soon as rates are collected."
          />
        ) : filteredEntries.length === 0 ? (
          <EmptyState
            title="No banks match your search"
            message="Try a different bank name or clear the search."
          />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEntries.map(({ bank, rate }) => (
              <BankCard key={bank.slug} bank={bank} rate={rate} />
            ))}
          </ul>
        )}
      </PageContainer>
    </SiteShell>
  );
}

export default BanksPage;
