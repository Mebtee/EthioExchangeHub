'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/locale-provider';
import { Heart, Building2, TrendingUp, Trash2, Star } from 'lucide-react';
import { LoadingPage } from '@/components/common/LoadingState';
import { EmptyState, ErrorState } from '@/components/common/ErrorState';
import { cn } from '@/lib/utils';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1';

async function fetchFavorites() {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/favorites`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Failed to fetch favorites');
  return res.json();
}

async function removeFavorite(id: string) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/favorites/${id}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Failed to remove favorite');
  return res.json();
}

export default function FavoritesPage() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['favorites'],
    queryFn: fetchFavorites,
    enabled: isAuthenticated,
  });

  const removeMutation = useMutation({
    mutationFn: removeFavorite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const favorites = data?.data ?? [];
  const bankFavorites = favorites.filter((f: any) => f.type === 'BANK');
  const currencyFavorites = favorites.filter((f: any) => f.type === 'CURRENCY');

  if (!isAuthenticated) {
    return (
      <div className="card flex flex-col items-center justify-center p-12">
        <Heart className="h-12 w-12 text-gray-300 dark:text-gray-600" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('als.signInRequired')}
        </h3>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('favorites.title')}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('favorites.subtitle')}</p>
      </div>

      {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

      {isLoading ? <LoadingPage /> : favorites.length === 0 ? (
        <EmptyState
          title={t('favorites.noFavorites')}
          message={t('favorites.subtitle')}
          icon={Heart}
        />
      ) : (
        <div className="space-y-8">
          {/* Favorite Banks */}
          {bankFavorites.length > 0 && (
            <div className="card">
              <div className="card-header flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary-500" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('favorites.banks')}</h3>
                <span className="badge-blue text-xs">{bankFavorites.length}</span>
              </div>
              <div className="card-body">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {bankFavorites.map((fav: any) => (
                    <div key={fav.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                          {fav.referenceId?.slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {fav.label ?? fav.referenceId}
                          </p>
                          <p className="text-xs text-gray-400">{fav.referenceId}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeMutation.mutate(fav.id)}
                        className="btn-ghost p-2 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Favorite Currencies */}
          {currencyFavorites.length > 0 && (
            <div className="card">
              <div className="card-header flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary-500" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('favorites.currencies')}</h3>
                <span className="badge-blue text-xs">{currencyFavorites.length}</span>
              </div>
              <div className="card-body">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {currencyFavorites.map((fav: any) => (
                    <div key={fav.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-400" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{fav.referenceId}</span>
                      </div>
                      <button
                        onClick={() => removeMutation.mutate(fav.id)}
                        className="btn-ghost p-1.5 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
