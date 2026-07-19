'use client';

import { cn, getCurrencySymbol, getCurrencyFlag } from '@/lib/utils';

export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', popular: true },
  { code: 'EUR', name: 'Euro', popular: true },
  { code: 'GBP', name: 'British Pound', popular: true },
  { code: 'SAR', name: 'Saudi Riyal', popular: false },
  { code: 'AED', name: 'UAE Dirham', popular: false },
  { code: 'CNY', name: 'Chinese Yuan', popular: false },
  { code: 'JPY', name: 'Japanese Yen', popular: false },
  { code: 'CHF', name: 'Swiss Franc', popular: false },
];

interface CurrencyTabsProps {
  selected: string[];
  onToggle: (currency: string) => void;
  onSelectAll?: (currencies: string[]) => void;
  multiSelect?: boolean;
}

export function CurrencyTabs({
  selected,
  onToggle,
  onSelectAll,
  multiSelect = true,
}: CurrencyTabsProps) {
  const popularCurrencies = CURRENCIES.filter((c) => c.popular);
  const otherCurrencies = CURRENCIES.filter((c) => !c.popular);

  return (
    <div>
      {/* Popular currencies */}
      <div className="flex flex-wrap gap-2">
        {popularCurrencies.map((currency) => {
          const isSelected = selected.includes(currency.code);
          return (
            <button
              key={currency.code}
              onClick={() => onToggle(currency.code)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all',
                isSelected
                  ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-750',
              )}
            >
              <span>{getCurrencyFlag(currency.code)}</span>
              <span>{currency.code}</span>
              <span className="text-xs opacity-60">{getCurrencySymbol(currency.code)}</span>
            </button>
          );
        })}
      </div>

      {/* Other currencies */}
      <div className="mt-2 flex flex-wrap gap-2">
        {otherCurrencies.map((currency) => {
          const isSelected = selected.includes(currency.code);
          return (
            <button
              key={currency.code}
              onClick={() => onToggle(currency.code)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all',
                isSelected
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600',
              )}
            >
              <span>{getCurrencyFlag(currency.code)}</span>
              <span>{currency.code}</span>
            </button>
          );
        })}
      </div>

      {/* Select all button */}
      {onSelectAll && multiSelect && (
        <button
          onClick={() =>
            onSelectAll(selected.length === CURRENCIES.length ? [] : CURRENCIES.map((c) => c.code))
          }
          className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          {selected.length === CURRENCIES.length ? 'Deselect All' : 'Select All'}
        </button>
      )}
    </div>
  );
}
