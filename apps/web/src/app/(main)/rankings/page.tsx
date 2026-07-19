'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Medal, ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown } from 'lucide-react';
import { LoadingPage, CardSkeleton } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { cn, formatRate } from '@/lib/utils';

const RANKING_CATEGORIES = [
  { value: 'EXCHANGE_RATE', label: 'Exchange Rates', icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { value: 'INTEREST_RATE', label: 'Interest Rates', icon: TrendingDown, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
  { value: 'SERVICE_QUALITY', label: 'Service Quality', icon: Medal, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  { value: 'CUSTOMER_SATISFACTION', label: 'Customer Satisfaction', icon: Medal, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { value: 'DIGITAL_BANKING', label: 'Digital Banking', icon: Medal, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  { value: 'OVERALL', label: 'Overall', icon: Medal, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
];

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1';

async function fetchRankings(category?: string) {
  const params = category ? `?category=${category}` : '';
  const res = await fetch(`${API_URL}/rankings${params}`);
  if (!res.ok) throw new Error('Failed to fetch rankings');
  return res.json();
}

export default function RankingsPage() {
  const [category, setCategory] = useState(RANKING_CATEGORIES[0]!.value);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['rankings', category],
    queryFn: () => fetchRankings(category),
  });

  const rankings = data?.data ?? [];

  // Filter and sort
  const filteredRankings = rankings
    .filter((r: any) => r.category === category)
    .sort((a: any, b: any) => a.rankPosition - b.rankPosition);

  if (isLoading) return <LoadingPage />;

  const activeCategory = RANKING_CATEGORIES.find((c) => c.value === category)!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Bank Rankings
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Compare Ethiopian banks across multiple categories
        </p>
      </div>

      {error && (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      )}

      {/* Category cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {RANKING_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const count = rankings.filter((r: any) => r.category === cat.value).length;
          return (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={cn(
                'card p-4 text-left transition-all',
                category === cat.value && 'ring-2 ring-primary-500 dark:ring-primary-400',
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn('rounded-lg p-2.5', cat.bg)}>
                  <Icon className={cn('h-5 w-5', cat.color)} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {cat.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {count || '—'} ranked banks
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Rankings list */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {activeCategory.label} Rankings
            </h2>
            {filteredRankings.length > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Updated: {new Date(filteredRankings[0]?.effectiveDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <div className="card-body">
          {filteredRankings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Medal className="h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                No rankings available for this category
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRankings.map((ranking: any, idx: number) => {
                const isTop3 = idx < 3;
                const rankChanged = ranking.previousRank !== null && ranking.previousRank !== undefined;
                const improved = rankChanged && ranking.rankPosition < ranking.previousRank;
                const declined = rankChanged && ranking.rankPosition > ranking.previousRank;

                const rankColors = [
                  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
                  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
                  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
                ];

                return (
                  <div
                    key={ranking.id}
                    className={cn(
                      'flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900',
                      isTop3 && 'bg-gradient-to-r from-transparent via-primary-50/30 to-transparent dark:via-primary-950/10',
                    )}
                  >
                    {/* Rank */}
                    <div
                      className={cn(
                        'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold',
                        rankColors[idx] ?? 'bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
                      )}
                    >
                      #{ranking.rankPosition}
                    </div>

                    {/* Bank info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {ranking.bankName ?? ranking.bankId}
                      </p>
                      {ranking.bankCode && (
                        <p className="text-xs text-gray-400">{ranking.bankCode}</p>
                      )}
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {typeof ranking.score === 'number' ? ranking.score.toFixed(2) : ranking.score}
                      </p>
                    </div>

                    {/* Change indicator */}
                    {rankChanged && (
                      <div
                        className={cn(
                          'flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium',
                          improved && 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
                          declined && 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
                          !improved && !declined && 'bg-gray-50 text-gray-400 dark:bg-gray-800',
                        )}
                      >
                        {improved ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : declined ? (
                          <ArrowDown className="h-3 w-3" />
                        ) : (
                          <Minus className="h-3 w-3" />
                        )}
                        <span>{Math.abs(ranking.rankPosition - ranking.previousRank)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
