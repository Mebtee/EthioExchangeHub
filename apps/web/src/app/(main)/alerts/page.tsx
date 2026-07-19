'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Plus, Trash2, BellOff, Check, X } from 'lucide-react';
import { LoadingPage } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/ErrorState';
import { cn, formatRate, formatDateTime } from '@/lib/utils';
import { CURRENCIES } from '@/components/rates/CurrencyTabs';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1';

async function fetchAlerts() {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/rate-alerts`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

async function createAlert(data: any) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/rate-alerts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to create alert' }));
    throw new Error(err.message ?? err.error?.message ?? 'Failed to create alert');
  }
  return res.json();
}

async function deleteAlert(id: string) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/rate-alerts/${id}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Failed to delete alert');
  return res.json();
}

export default function AlertsPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    currencyTo: 'USD',
    condition: 'ABOVE' as 'ABOVE' | 'BELOW',
    targetBuyRate: '',
    targetSellRate: '',
  });
  const [formError, setFormError] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['alerts'],
    queryFn: fetchAlerts,
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: createAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setShowCreateForm(false);
      setFormData({ currencyTo: 'USD', condition: 'ABOVE', targetBuyRate: '', targetSellRate: '' });
      setFormError('');
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const alerts = data?.data ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.targetBuyRate && !formData.targetSellRate) {
      setFormError('Please enter at least one target rate');
      return;
    }

    createMutation.mutate({
      currencyTo: formData.currencyTo,
      condition: formData.condition,
      targetBuyRate: formData.targetBuyRate ? Number(formData.targetBuyRate) : undefined,
      targetSellRate: formData.targetSellRate ? Number(formData.targetSellRate) : undefined,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="card flex flex-col items-center justify-center p-12">
        <BellOff className="h-12 w-12 text-gray-300 dark:text-gray-600" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Sign in required
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Please sign in to manage your rate alerts
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Rate Alerts
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get notified when exchange rates hit your target
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary text-sm"
        >
          <Plus className="h-4 w-4" />
          New Alert
        </button>
      </div>

      {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

      {/* Create form */}
      {showCreateForm && (
        <div className="card p-6 animate-fade-in">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Create Rate Alert
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                {formError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Currency
                </label>
                <select
                  value={formData.currencyTo}
                  onChange={(e) => setFormData({ ...formData, currencyTo: e.target.value })}
                  className="input-field py-2 text-sm"
                  required
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Condition
                </label>
                <div className="flex gap-2">
                  {(['ABOVE', 'BELOW'] as const).map((cond) => (
                    <button
                      key={cond}
                      type="button"
                      onClick={() => setFormData({ ...formData, condition: cond })}
                      className={cn(
                        'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                        formData.condition === cond
                          ? cond === 'ABOVE'
                            ? 'bg-green-600 text-white'
                            : 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                      )}
                    >
                      {cond === 'ABOVE' ? 'Above' : 'Below'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Target Buy Rate (optional)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="e.g. 55.0000"
                  value={formData.targetBuyRate}
                  onChange={(e) => setFormData({ ...formData, targetBuyRate: e.target.value })}
                  className="input-field py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                  Target Sell Rate (optional)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="e.g. 56.0000"
                  value={formData.targetSellRate}
                  onChange={(e) => setFormData({ ...formData, targetSellRate: e.target.value })}
                  className="input-field py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn-primary text-sm"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Alert'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Alerts list */}
      {isLoading ? (
        <LoadingPage />
      ) : alerts.length === 0 ? (
        <EmptyState
          title="No alerts"
          message="Create your first rate alert to get notified when rates change"
          action={{
            label: 'Create Alert',
            onClick: () => setShowCreateForm(true),
          }}
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert: any) => (
            <div
              key={alert.id}
              className={cn(
                'card p-4 transition-all',
                !alert.isActive && 'opacity-50',
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      alert.condition === 'ABOVE'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-red-100 dark:bg-red-900/30',
                    )}
                  >
                    <Bell
                      className={cn(
                        'h-5 w-5',
                        alert.condition === 'ABOVE'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400',
                      )}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {alert.currencyTo} {alert.condition === 'ABOVE' ? 'above' : 'below'}{' '}
                      {alert.targetBuyRate && `buy: ${formatRate(alert.targetBuyRate)}`}
                      {alert.targetSellRate && (alert.targetBuyRate ? ', ' : '')}
                      {alert.targetSellRate && `sell: ${formatRate(alert.targetSellRate)}`}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span
                        className={cn(
                          'badge text-[10px]',
                          alert.isActive ? 'badge-green' : 'badge-red',
                        )}
                      >
                        {alert.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {alert.lastTriggeredAt && (
                        <span className="text-[10px] text-gray-400">
                          Last triggered: {formatDateTime(alert.lastTriggeredAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => deleteMutation.mutate(alert.id)}
                  className="btn-ghost rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  aria-label="Delete alert"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
