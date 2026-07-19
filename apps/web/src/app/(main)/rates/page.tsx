'use client';

import { useState, useCallback } from 'react';
import { Download, FileText, RefreshCw } from 'lucide-react';
import { useLatestRates, useHistoricalRates, useCompareRates, useBestRates, useCurrencies, useExportCsvUrl } from '@/lib/hooks/use-api';
import { useRatesStore } from '@/lib/stores/rates-store';
import { useUiStore } from '@/lib/stores/ui-store';
import { RateTable } from '@/components/rates/RateTable';
import { CurrencyTabs } from '@/components/rates/CurrencyTabs';
import { LiveTicker } from '@/components/rates/LiveTicker';
import { RateFilters } from '@/components/rates/RateFilters';
import { CompareTable } from '@/components/rates/CompareTable';
import { BestRatesCard } from '@/components/rates/BestRatesCard';
import { RateChart } from '@/components/rates/RateChart';
import { Pagination } from '@/components/common/Pagination';
import { LoadingPage, TableSkeleton } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { cn } from '@/lib/utils';
import type { TabId } from '@/lib/types';

const TABS: { id: TabId; label: string }[] = [
  { id: 'latest', label: 'Latest' },
  { id: 'historical', label: 'Historical' },
  { id: 'compare', label: 'Compare' },
  { id: 'best', label: 'Best Rates' },
];

export default function RatesPage() {
  const { activeRateTab, setActiveRateTab } = useUiStore();
  const {
    latestFilters, setLatestFilters, resetLatestFilters,
    historicalFilters, setHistoricalFilters, resetHistoricalFilters,
    compareFilters, setCompareFilters, resetCompareFilters,
    bestFilters, setBestFilters, resetBestFilters,
    selectedCurrencies, toggleCurrency, setSelectedCurrencies,
  } = useRatesStore();

  // Queries
  const latestQuery = useLatestRates(latestFilters);
  const historicalQuery = useHistoricalRates(historicalFilters);
  const compareQuery = useCompareRates(compareFilters);
  const bestQuery = useBestRates(bestFilters);
  const { data: currenciesData } = useCurrencies();

  const [showChart, setShowChart] = useState(false);
  const csvUrl = useExportCsvUrl({
    currencyTo: latestFilters.currencyTo,
    bankCode: latestFilters.bankCode,
    fromDate: undefined,
    toDate: undefined,
    includeNbe: undefined,
  });

  const currencies = currenciesData?.data ?? ['USD', 'EUR', 'GBP'];

  const handleExportPdf = useCallback(async () => {
    const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1';
    const params = new URLSearchParams();
    Object.entries(latestFilters).forEach(([key, value]) => {
      if (value) params.set(key, String(value));
    });
    window.open(`${API_URL}/exchange-rates/export/pdf?${params}`, '_blank');
  }, [latestFilters]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Exchange Rates
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Real-time and historical exchange rates for all Ethiopian banks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPdf} className="btn-secondary text-sm">
            <FileText className="h-4 w-4" />
            PDF
          </button>
          <a href={csvUrl} download className="btn-secondary text-sm">
            <Download className="h-4 w-4" />
            CSV
          </a>
          <button
            onClick={() => latestQuery.refetch()}
            className="btn-ghost rounded-lg p-2"
            disabled={latestQuery.isLoading}
          >
            <RefreshCw className={cn('h-4 w-4', latestQuery.isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Live ticker */}
      <LiveTicker rates={latestQuery.data?.data ?? []} isLoading={latestQuery.isLoading} />

      {/* Tab navigation */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveRateTab(tab.id)}
            className={cn(
              'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all',
              activeRateTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeRateTab === 'latest' && (
        <div className="space-y-4">
          <RateFilters
            currencyTo={latestFilters.currencyTo}
            bankCode={latestFilters.bankCode}
            onCurrencyChange={(c) => setLatestFilters({ currencyTo: c, page: 1 })}
            onBankChange={(b) => setLatestFilters({ bankCode: b, page: 1 })}
            onReset={resetLatestFilters}
          />

          <CurrencyTabs
            selected={selectedCurrencies}
            onToggle={toggleCurrency}
            onSelectAll={(c) => setSelectedCurrencies(c)}
          />

          {latestQuery.isError ? (
            <ErrorState message={(latestQuery.error as Error).message} onRetry={() => latestQuery.refetch()} />
          ) : (
            <div className="card">
              <div className="card-body">
                <RateTable
                  data={(latestQuery.data?.data ?? []).filter((r: any) => selectedCurrencies.includes(r.currencyTo))}
                  isLoading={latestQuery.isLoading}
                />
                {latestQuery.data?.meta && (
                  <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                    <Pagination
                      {...latestQuery.data.meta}
                      onPageChange={(p) => setLatestFilters({ page: p })}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeRateTab === 'historical' && (
        <div className="space-y-4">
          <RateFilters
            currencyTo={historicalFilters.currencyTo}
            bankCode={historicalFilters.bankCode}
            fromDate={historicalFilters.fromDate}
            toDate={historicalFilters.toDate}
            onCurrencyChange={(c) => setHistoricalFilters({ currencyTo: c, page: 1 })}
            onBankChange={(b) => setHistoricalFilters({ bankCode: b, page: 1 })}
            onFromDateChange={(d) => setHistoricalFilters({ fromDate: d, page: 1 })}
            onToDateChange={(d) => setHistoricalFilters({ toDate: d, page: 1 })}
            onReset={resetHistoricalFilters}
            showDateRange
          />

          {historicalQuery.isError ? (
            <ErrorState message={(historicalQuery.error as Error).message} onRetry={() => historicalQuery.refetch()} />
          ) : (
            <div className="space-y-4">
              {/* Chart toggle */}
              <button
                onClick={() => setShowChart(!showChart)}
                className="btn-ghost text-sm"
              >
                {showChart ? 'Hide Chart' : 'Show Chart'}
              </button>

              {showChart && (
                <div className="card p-6">
                  <RateChart
                    data={historicalQuery.data?.data ?? []}
                    currencyTo={historicalFilters.currencyTo}
                    height={300}
                  />
                </div>
              )}

              <div className="card">
                <div className="card-body">
                  <RateTable
                    data={historicalQuery.data?.data ?? []}
                    isLoading={historicalQuery.isLoading}
                  />
                  {historicalQuery.data?.meta && (
                    <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
                      <Pagination
                        {...historicalQuery.data.meta}
                        onPageChange={(p) => setHistoricalFilters({ page: p })}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeRateTab === 'compare' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[140px]">
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Currency
              </label>
              <select
                value={compareFilters.currencyTo ?? 'USD'}
                onChange={(e) => setCompareFilters({ currencyTo: e.target.value })}
                className="input-field py-2 text-sm"
              >
                {currencies.map((c: string) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[140px]">
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Date
              </label>
              <input
                type="date"
                value={compareFilters.date ?? ''}
                onChange={(e) => setCompareFilters({ date: e.target.value || undefined })}
                className="input-field py-2 text-sm"
              />
            </div>
            <button onClick={resetCompareFilters} className="btn-ghost text-sm">
              Reset
            </button>
          </div>

          {compareQuery.isError ? (
            <ErrorState message={(compareQuery.error as Error).message} onRetry={() => compareQuery.refetch()} />
          ) : (
            <CompareTable data={compareQuery.data ?? { banks: [], summary: null, currencyTo: compareFilters.currencyTo ?? 'USD', effectiveDate: '', nbeReference: null }} isLoading={compareQuery.isLoading} />
          )}
        </div>
      )}

      {activeRateTab === 'best' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[140px]">
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Currency
              </label>
              <select
                value={bestFilters.currencyTo ?? 'USD'}
                onChange={(e) => setBestFilters({ currencyTo: e.target.value })}
                className="input-field py-2 text-sm"
              >
                {currencies.map((c: string) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[100px]">
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                Type
              </label>
              <div className="flex gap-1 rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
                {(['buy', 'sell'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setBestFilters({ type: t })}
                    className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-all ${
                      bestFilters.type === t
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={resetBestFilters} className="btn-ghost text-sm">
              Reset
            </button>
          </div>

          {bestQuery.isError ? (
            <ErrorState message={(bestQuery.error as Error).message} onRetry={() => bestQuery.refetch()} />
          ) : (
            <BestRatesCard data={bestQuery.data ?? { currencyTo: bestFilters.currencyTo ?? 'USD', type: bestFilters.type ?? 'buy', best: null, worst: null, average: 0, banks: [], totalBanks: 0 }} isLoading={bestQuery.isLoading} />
          )}
        </div>
      )}
    </div>
  );
}
