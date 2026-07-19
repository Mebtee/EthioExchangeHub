'use client';

import { Search, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CURRENCIES } from './CurrencyTabs';

interface RateFiltersProps {
  currencyTo?: string;
  bankCode?: string;
  fromDate?: string;
  toDate?: string;
  onCurrencyChange: (currency: string | undefined) => void;
  onBankChange: (bank: string | undefined) => void;
  onFromDateChange?: (date: string | undefined) => void;
  onToDateChange?: (date: string | undefined) => void;
  onReset: () => void;
  showDateRange?: boolean;
  bankOptions?: { code: string; name: string }[];
}

export function RateFilters({
  currencyTo,
  bankCode,
  fromDate,
  toDate,
  onCurrencyChange,
  onBankChange,
  onFromDateChange,
  onToDateChange,
  onReset,
  showDateRange,
  bankOptions,
}: RateFiltersProps) {
  const hasFilters = currencyTo || bankCode || fromDate || toDate;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-end gap-3">
        {/* Currency filter */}
        <div className="flex-1 min-w-[140px]">
          <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
            Currency
          </label>
          <select
            value={currencyTo ?? ''}
            onChange={(e) => onCurrencyChange(e.target.value || undefined)}
            className="input-field py-2 text-sm"
          >
            <option value="">All Currencies</option>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Bank filter */}
        <div className="flex-1 min-w-[140px]">
          <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
            Bank
          </label>
          <select
            value={bankCode ?? ''}
            onChange={(e) => onBankChange(e.target.value || undefined)}
            className="input-field py-2 text-sm"
          >
            <option value="">All Banks</option>
            {bankOptions?.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date range filters */}
        {showDateRange && (
          <>
            <div className="flex-1 min-w-[140px]">
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                From Date
              </label>
              <input
                type="date"
                value={fromDate ?? ''}                  onChange={(e) => onFromDateChange?.(e.target.value || undefined)}
                className="input-field py-2 text-sm"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                To Date
              </label>
              <input
                type="date"
                value={toDate ?? ''}                  onChange={(e) => onToDateChange?.(e.target.value || undefined)}
                className="input-field py-2 text-sm"
              />
            </div>
          </>
        )}

        {/* Reset button */}
        {hasFilters && (
          <button onClick={onReset} className="btn-ghost text-sm">
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
