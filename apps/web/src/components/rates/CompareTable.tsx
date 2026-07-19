'use client';

import { cn, formatRate, getCurrencyFlag } from '@/lib/utils';
import type { CompareRatesResponse } from '@/lib/types';

interface CompareTableProps {
  data: CompareRatesResponse;
  isLoading?: boolean;
}

export function CompareTable({ data, isLoading }: CompareTableProps) {
  if (isLoading) {
    return (
      <div className="card animate-pulse p-6">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-5 w-24 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-5 w-20 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-5 w-20 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-5 w-20 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.banks.length === 0) {
    return (
      <div className="card flex items-center justify-center p-12">
        <p className="text-sm text-gray-400">No comparison data available</p>
      </div>
    );
  }

  return (
    <div>
      {/* NBE Reference */}
      {data.nbeReference && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                National Bank of Ethiopia (Reference)
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Official reference rates
              </p>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-xs text-amber-600 dark:text-amber-400">Buy</p>
                <p className="font-mono text-lg font-bold text-amber-800 dark:text-amber-300">
                  {formatRate(data.nbeReference.buyRate)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-amber-600 dark:text-amber-400">Sell</p>
                <p className="font-mono text-lg font-bold text-amber-800 dark:text-amber-300">
                  {formatRate(data.nbeReference.sellRate)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bank comparison table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Bank
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Buy Rate
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Sell Rate
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Spread
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.banks.map((rate) => {
              const bestBuyRate = Math.max(...data.banks.map((r) => r.buyRate));
              const bestSellRate = Math.min(...data.banks.map((r) => r.sellRate));
              const isBestBuy = rate.buyRate === bestBuyRate;
              const isBestSell = rate.sellRate === bestSellRate;

              return (
                <tr
                  key={rate.bankCode}
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-100 text-[10px] font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                        {rate.bankCode}
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {rate.bankName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        'font-mono text-sm font-semibold',
                        isBestBuy
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-900 dark:text-gray-100',
                      )}
                    >
                      {formatRate(rate.buyRate)}
                      {isBestBuy && <span className="ml-1 text-xs">★</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={cn(
                        'font-mono text-sm font-semibold',
                        isBestSell
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-900 dark:text-gray-100',
                      )}
                    >
                      {formatRate(rate.sellRate)}
                      {isBestSell && <span className="ml-1 text-xs">★</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                      {formatRate(rate.spread)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      {data.summary && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Banks</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {data.summary.banksCount}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Avg Buy</p>
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
              {formatRate(data.summary.averageBuyRate)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Avg Sell</p>
            <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {formatRate(data.summary.averageSellRate)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Avg Spread</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {formatRate(data.summary.averageSpread)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
