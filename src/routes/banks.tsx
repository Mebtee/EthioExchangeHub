import { useMemo } from "react";

import { BankCard } from "@/components/banks/bank-card";
import { SiteShell, PageContainer } from "@/components/layout/site-shell";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/async-states";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { getPrimaryCurrency } from "@/lib/rankings";
import { useBanks, useExchangeRates } from "@/hooks";
import type { ExchangeRate } from "@/types/exchange-rate";

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
    const rateByBank = new Map<string, ExchangeRate>();
    for (const r of rates) {
      if (r.currency !== primaryCurrency) continue;
      const k = key(r.bankName);
      const existing = rateByBank.get(k);
      if (!existing || r.lastUpdated > existing.lastUpdated) rateByBank.set(k, r);
    }
    return banks
      .filter((b) => rateByBank.has(key(b.name)))
      .map((bank) => ({ bank, rate: rateByBank.get(key(bank.name))! }));
  }, [banks, rates, primaryCurrency]);

  const isLoading = banksLoading || ratesLoading;
  const isError = banksError || ratesError;
  const onRetry = () => {
    void refetchBanks();
    void refetchRates();
  };

  return (
    <SiteShell>
      <PageContainer>
        <PageHeader
          title="Bank Directory"
          description={
            isLoading
              ? "Loading commercial bank rates…"
              : primaryCurrency
                ? `${bankEntries.length} commercial banks reporting live ${primaryCurrency}/ETB rates.`
                : "No bank rates available yet."
          }
          action={
            <SearchInput placeholder="Search bank name..." wrapperClassName="w-full sm:w-72" />
          }
        />

        {isLoading ? (
          <LoadingState
            label="Loading bank directory…"
            hint="Fetching the latest bank rates from the market service."
          />
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
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bankEntries.map(({ bank, rate }) => (
              <BankCard key={bank.slug} bank={bank} rate={rate} />
            ))}
          </ul>
        )}
      </PageContainer>
    </SiteShell>
  );
}

export default BanksPage;
