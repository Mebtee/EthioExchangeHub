'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { useBanks } from '@/lib/hooks/use-api';
import { BankCards } from '@/components/banks/BankCards';
import { LoadingPage } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { cn } from '@/lib/utils';

const BANK_CODES = [
  'CBE', 'AWIN', 'DASH', 'BOA', 'WB', 'UB', 'NIB', 'BIB', 'LIB',
  'ZEMEN', 'AB', 'BUNNA', 'DB', 'ENAT', 'COOP', 'SM', 'HIB', 'TSB',
  'AMHARA', 'GADA', 'OMO',
];

export default function BanksPage() {
  const { data, isLoading, error, refetch } = useBanks();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const banks = data?.data ?? [];

  const filteredBanks = banks.filter((bank: any) => {
    if (searchQuery && !bank.name.toLowerCase().includes(searchQuery.toLowerCase()) && !bank.code.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedCode && bank.code !== selectedCode) return false;
    return true;
  });

  if (isLoading) return <LoadingPage />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Ethiopian Banks
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {banks.length} banks tracked — compare services, rates, and rankings
        </p>
      </div>

      {error && (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      )}

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search banks by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedCode(null)}
            className={cn(
              'rounded-lg px-3 py-2 text-xs font-medium transition-all',
              !selectedCode
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400',
            )}
          >
            All
          </button>
          {BANK_CODES.slice(0, 10).map((code) => (
            <button
              key={code}
              onClick={() => setSelectedCode(selectedCode === code ? null : code)}
              className={cn(
                'rounded-lg px-3 py-2 text-xs font-medium transition-all',
                selectedCode === code
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400',
              )}
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      {/* Bank cards grid */}
      <BankCards banks={filteredBanks} onBankClick={(bank) => window.open(bank.website ?? '#', '_blank')} />

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{banks.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Banks</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {banks.filter((b: any) => b.isActive).length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Active Banks</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{filteredBanks.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Filtered Results</p>
        </div>
      </div>
    </div>
  );
}
