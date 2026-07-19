'use client';

import { useAuth } from '@/lib/auth-context';
import { useLatestRates, useCurrencies, useBanks } from '@/lib/hooks/use-api';
import { StatCard } from '@/components/common/StatCard';
import { LiveTicker } from '@/components/rates/LiveTicker';
import { RateTable } from '@/components/rates/RateTable';
import { CurrencyTabs } from '@/components/rates/CurrencyTabs';
import { LoadingPage } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { useRatesStore } from '@/lib/stores/rates-store';
import {
  TrendingUp,
  Building2,
  DollarSign,
  Activity,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const { selectedCurrencies, toggleCurrency } = useRatesStore();

  const { data: ratesData, isLoading: ratesLoading, error: ratesError, refetch: refetchRates } = useLatestRates({ limit: 10 });
  const { data: currenciesData } = useCurrencies();
  const { data: banksData } = useBanks();

  const rates = ratesData?.data ?? [];
  const currencies = currenciesData?.data ?? ['USD', 'EUR', 'GBP'];
  const banks = banksData?.data ?? [];

  if (ratesLoading && rates.length === 0) return <LoadingPage />;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Welcome, {user?.fullName?.split(' ')[0] ?? 'there'}!
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Your centralized Ethiopian banking overview
        </p>
      </div>

      {/* Error banner */}
      {ratesError && (
        <ErrorState
          message={(ratesError as Error).message}
          onRetry={() => refetchRates()}
        />
      )}

      {/* Live ticker */}
      <LiveTicker rates={rates} isLoading={ratesLoading} />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Exchange Rates"
          value={`${currencies.length} currencies`}
          subtitle="Across all Ethiopian banks"
          icon={<TrendingUp className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="Banks Tracked"
          value={banks.length}
          subtitle="Active Ethiopian banks"
          icon={<Building2 className="h-5 w-5" />}
          color="purple"
        />
        <StatCard
          title="Best Buy Rate"
          value={rates.length > 0 ? `${rates[0]?.buyRate.toFixed(2)} ETB` : '—'}
          subtitle={rates[0]?.bankName ?? 'N/A'}
          icon={<DollarSign className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title="Market Activity"
          value={`${rates.length} updates`}
          subtitle="Last 24 hours"
          icon={<Activity className="h-5 w-5" />}
          color="amber"
          trend="up"
          trendValue="12%"
        />
      </div>

      {/* Latest rates */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Latest Exchange Rates
          </h2>
          <a
            href="/rates"
            className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            View All →
          </a>
        </div>
        <div className="card-body">
          <div className="mb-4">
            <CurrencyTabs
              selected={selectedCurrencies}
              onToggle={toggleCurrency}
              multiSelect
            />
          </div>
          <RateTable
            data={rates.filter((r: any) => selectedCurrencies.includes(r.currencyTo))}
            isLoading={ratesLoading}
            compact
          />
        </div>
      </div>
    </div>
  );
}
