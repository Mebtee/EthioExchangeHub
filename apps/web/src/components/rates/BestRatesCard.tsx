'use client';

import { TrendingUp, TrendingDown, Award, AlertTriangle } from 'lucide-react';
import { cn, formatRate, getCurrencyFlag } from '@/lib/utils';
import type { BestRatesResponse } from '@/lib/types';

interface BestRatesCardProps {
  data: BestRatesResponse;
  isLoading?: boolean;
}

export function BestRatesCard({ data, isLoading }: BestRatesCardProps) {
  if (isLoading) {
    return (
      <div className="card animate-pulse p-6">
        <div className="mb-4 h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.banks.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">No rate data available</p>
      </div>
    );
  }

  const currency = data.currencyTo;

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="mb-5 flex items-center gap-2">
        <span className="text-lg">{getCurrencyFlag(currency)}</span>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {currency} Exchange Rates
        </h3>
        <span className="badge-blue text-xs capitalize">{data.type} rates</span>
      </div>

      {/* Best / Worst / Average */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Best */}
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900/50 dark:bg-green-950/20">
          <div className="flex items-center gap-1.5">
            <Award className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium text-green-700 dark:text-green-300">
              Best {data.type === 'buy' ? 'Buy' : 'Sell'}
            </span>
          </div>
          {data.best && (
            <>
              <p className="mt-2 font-mono text-xl font-bold text-green-700 dark:text-green-300">
                {formatRate(data.best[`${data.type}Rate` as keyof typeof data.best] as number)}
              </p>
              <p className="mt-0.5 text-xs text-green-600 dark:text-green-400">
                {data.best.bankName}
              </p>
            </>
          )}
        </div>

        {/* Average */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Average</span>
          </div>
          <p className="mt-2 font-mono text-xl font-bold text-blue-700 dark:text-blue-300">
            {formatRate(data.average)}
          </p>
          <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">
            Across {data.totalBanks} banks
          </p>
        </div>

        {/* Worst */}
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-xs font-medium text-red-700 dark:text-red-300">
              Worst {data.type === 'buy' ? 'Buy' : 'Sell'}
            </span>
          </div>
          {data.worst && (
            <>
              <p className="mt-2 font-mono text-xl font-bold text-red-700 dark:text-red-300">
                {formatRate(data.worst[`${data.type}Rate` as keyof typeof data.worst] as number)}
              </p>
              <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                {data.worst.bankName}
              </p>
            </>
          )}
        </div>
      </div>

      {/* All banks comparison */}
      {data.banks.length > 0 && (
        <div className="mt-5">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            All Banks
          </h4>
          <div className="space-y-1.5">
            {data.banks.map((rate) => (
              <div
                key={rate.bankCode}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400">{rate.bankCode}</span>
                  <span className="text-gray-700 dark:text-gray-300">{rate.bankName}</span>
                </div>
                <span
                  className={cn(
                    'font-mono font-semibold',
                    data.type === 'buy'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-blue-600 dark:text-blue-400',
                  )}
                >
                  {formatRate(
                    data.type === 'buy' ? rate.buyRate : rate.sellRate,
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
