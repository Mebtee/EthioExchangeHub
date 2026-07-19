'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Medal,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { cn, formatRate } from '@/lib/utils';
import type { Ranking } from '@/lib/types';

const RANKING_CATEGORIES = [
  { value: 'EXCHANGE_RATE', label: 'Exchange Rates', color: 'text-blue-600 dark:text-blue-400' },
  { value: 'INTEREST_RATE', label: 'Interest Rates', color: 'text-green-600 dark:text-green-400' },
  { value: 'SERVICE_QUALITY', label: 'Service Quality', color: 'text-purple-600 dark:text-purple-400' },
  { value: 'CUSTOMER_SATISFACTION', label: 'Customer Satisfaction', color: 'text-amber-600 dark:text-amber-400' },
  { value: 'DIGITAL_BANKING', label: 'Digital Banking', color: 'text-indigo-600 dark:text-indigo-400' },
  { value: 'OVERALL', label: 'Overall', color: 'text-rose-600 dark:text-rose-400' },
];

interface RankingsTableProps {
  data: Ranking[];
  isLoading?: boolean;
}

export function RankingsTable({ data, isLoading }: RankingsTableProps) {
  const [category, setCategory] = useState(RANKING_CATEGORIES[0]!.value);

  const filteredData = data.filter((r) => r.category === category).sort((a, b) => a.rankPosition - b.rankPosition);

  if (isLoading) {
    return (
      <div className="card animate-pulse p-6">
        <div className="mb-4 flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-24 rounded-lg bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-5 w-8 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-5 w-40 flex-1 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-5 w-16 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-900">
        {RANKING_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
              category === cat.value
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Rankings list */}
      <div className="p-4">
        {filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Medal className="h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No rankings available for this category</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredData.map((ranking, idx) => {
              const isTop3 = idx < 3;
              const rankChanged = ranking.previousRank !== null && ranking.previousRank !== undefined;
              const prevRank = ranking.previousRank ?? 0;
              const improved = rankChanged && ranking.rankPosition < prevRank;
              const declined = rankChanged && ranking.rankPosition > prevRank;

              return (
                <div
                  key={ranking.id}
                  className={cn(
                    'flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900',
                    isTop3 && 'bg-gradient-to-r from-transparent via-primary-50/30 to-transparent dark:via-primary-950/10',
                  )}
                >
                  {/* Rank position */}
                  <div
                    className={cn(
                      'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold',
                      idx === 0
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        : idx === 1
                          ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                          : idx === 2
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                            : 'bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
                    )}
                  >
                    #{ranking.rankPosition}
                  </div>

                  {/* Bank info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {ranking.bankName ?? ranking.bankId}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {ranking.score.toFixed(2)}
                    </p>
                  </div>

                  {/* Rank change */}
              {rankChanged && (
                <div
                  className={cn(
                    'flex items-center gap-0.5 text-xs font-medium',
                    improved && 'text-green-600 dark:text-green-400',
                    declined && 'text-red-600 dark:text-red-400',
                    !improved && !declined && 'text-gray-400',
                  )}
                >
                  {improved ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : declined ? (
                    <ArrowDown className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  <span>{Math.abs(ranking.rankPosition - prevRank)}</span>
                </div>
              )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
