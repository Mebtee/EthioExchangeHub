'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/locale-provider';
import { Wallet, Plus, Trash2, TrendingUp, Building2, PiggyBank, MoreHorizontal } from 'lucide-react';
import { StatCard } from '@/components/common/StatCard';
import { LoadingPage } from '@/components/common/LoadingState';
import { EmptyState } from '@/components/common/ErrorState';
import { ErrorState } from '@/components/common/ErrorState';
import { CURRENCIES } from '@/components/rates/CurrencyTabs';
import { cn, formatCurrency } from '@/lib/utils';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1';

async function fetchPortfolio() {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/portfolio`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Failed to fetch portfolio');
  return res.json();
}

async function addPortfolioItem(data: any) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/portfolio/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to add item');
  return res.json();
}

async function removeItem(id: string) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/portfolio/items/${id}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Failed to remove item');
  return res.json();
}

export default function PortfolioPage() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'CURRENCY_HOLDING' as string,
    currency: 'USD',
    amount: '',
    description: '',
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['portfolio'],
    queryFn: fetchPortfolio,
    enabled: isAuthenticated,
  });

  const addMutation = useMutation({
    mutationFn: addPortfolioItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      setShowForm(false);
      setFormData({ type: 'CURRENCY_HOLDING', currency: 'USD', amount: '', description: '' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['portfolio'] }),
  });

  const dashboard = data?.data;
  const items = dashboard?.items ?? [];
  const holdings = dashboard?.holdings ?? [];
  const summary = dashboard?.summary;

  const PORTFOLIO_TYPES = [
    { value: 'CURRENCY_HOLDING', label: t('portfolio.holding'), icon: Wallet },
    { value: 'BANK_ACCOUNT', label: t('portfolio.bankAccount'), icon: Building2 },
    { value: 'INVESTMENT', label: t('portfolio.investment'), icon: TrendingUp },
    { value: 'OTHER', label: t('portfolio.other'), icon: PiggyBank },
  ];

  if (!isAuthenticated) {
    return (
      <div className="card flex flex-col items-center justify-center p-12">
        <Wallet className="h-12 w-12 text-gray-300" />
        <h3 className="mt-4 text-lg font-semibold">{t('als.signInRequired')}</h3>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('portfolio.title')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('portfolio.subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          <Plus className="h-4 w-4" />
          {t('portfolio.add')}
        </button>
      </div>

      {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

      {isLoading ? <LoadingPage /> : (
        <>
          {summary && (
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard title={t('portfolio.totalItems')} value={summary.totalItems} icon={<Wallet className="h-5 w-5" />} color="blue" />
              <StatCard title={t('portfolio.totalValue')} value={`${formatCurrency(summary.totalEtbValue, 'ETB')}`} icon={<TrendingUp className="h-5 w-5" />} color="green" />
              <StatCard title={t('portfolio.currencies')} value={summary.currenciesHeld} icon={<Wallet className="h-5 w-5" />} color="purple" />
            </div>
          )}

          {/* Holdings breakdown */}
          {holdings.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('portfolio.currencies')}</h3>
              </div>
              <div className="card-body">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {holdings.map((h: any) => (
                    <div key={h.currency} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-sm font-bold dark:bg-primary-900/40">
                            {h.currency}
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{h.currency}</span>
                        </div>
                        <span className="text-xs text-gray-400">{h.items} items</span>
                      </div>
                      <p className="mt-3 text-lg font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(h.totalAmount, h.currency)}
                      </p>
                      <p className="text-xs text-gray-500">
                        ≈ {formatCurrency(h.estimatedEtbValue, 'ETB')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Add form */}
          {showForm && (
            <div className="card p-6 animate-fade-in">
              <h3 className="mb-4 text-lg font-semibold">{t('portfolio.add')}</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                addMutation.mutate({
                  type: formData.type,
                  currency: formData.currency,
                  amount: Number(formData.amount),
                  description: formData.description || undefined,
                });
              }} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-500">Type</label>
                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="input-field py-2 text-sm" required>
                      {PORTFOLIO_TYPES.map((pt) => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-500">Currency</label>
                    <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="input-field py-2 text-sm" required>
                      {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-500">Amount</label>
                    <input type="number" step="0.01" value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="input-field py-2 text-sm" required />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-500">Description</label>
                    <input type="text" value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="input-field py-2 text-sm" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={addMutation.isPending} className="btn-primary text-sm">
                    {addMutation.isPending ? 'Adding...' : t('common.save')}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Items list */}
          {items.length === 0 ? (
            <EmptyState
              title={t('portfolio.noItems')}
              message={t('portfolio.subtitle')}
              action={{ label: t('portfolio.add'), onClick: () => setShowForm(true) }}
            />
          ) : (
            <div className="space-y-2">
              {items.map((item: any) => {
                const TypeIcon = PORTFOLIO_TYPES.find((pt) => pt.value === item.type)?.icon ?? Wallet;
                return (
                  <div key={item.id} className="card flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                        <TypeIcon className="h-5 w-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {item.currency} — {formatCurrency(Number(item.amount), item.currency)}
                        </p>
                        {item.description && (
                          <p className="text-xs text-gray-500">{item.description}</p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => removeMutation.mutate(item.id)}
                      className="btn-ghost p-2 text-red-500 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
