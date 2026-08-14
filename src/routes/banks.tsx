import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { BankCard } from "@/components/banks/bank-card";
import { SiteShell, PageContainer } from "@/components/layout/site-shell";
import { EmptyState, ErrorState } from "@/components/shared/async-states";
import { CardGridSkeleton } from "@/components/shared/skeletons";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { filterToLatestBusinessDay, getPrimaryCurrency } from "@/lib/rankings";
import { useBanks, useExchangeRates } from "@/hooks";
import { Seo } from "@/components/shared/seo";

function key(bankName: string): string {
  return bankName.trim().toLowerCase();
}

function BanksPage() {
  const { t } = useTranslation();
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

  /**
   * Banks that have published a rate for the primary currency on that
   * currency's latest business date. A bank that only published on an older
   * date is excluded entirely — its old rate is never shown as a current rate.
   */
  const bankEntries = useMemo(() => {
    const currentRates = filterToLatestBusinessDay(rates, primaryCurrency);
    const rateByBank = new Map(currentRates.map((r) => [key(r.bankName), r]));
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
      <Seo title={t("seo.banks.title")} description={t("seo.banks.description")} />
      <PageContainer>
        <PageHeader
          title={t("banks.title")}
          description={
            isLoading
              ? t("banks.loading")
              : primaryCurrency
                ? t("banks.reportingLive", { count: bankEntries.length, currency: primaryCurrency })
                : t("banks.noRatesYet")
          }
          action={
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder={t("banks.searchPlaceholder")}
              wrapperClassName="w-full sm:w-72"
            />
          }
        />

        {isLoading ? (
          <CardGridSkeleton count={6} />
        ) : isError ? (
          <ErrorState
            title={t("banks.unableToLoad")}
            message={error instanceof Error ? error.message : t("banks.loadError")}
            onRetry={onRetry}
          />
        ) : bankEntries.length === 0 ? (
          <EmptyState title={t("banks.noRates")} message={t("banks.noRatesMessage")} />
        ) : filteredEntries.length === 0 ? (
          <EmptyState title={t("banks.noMatch")} message={t("banks.noMatchMessage")} />
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
