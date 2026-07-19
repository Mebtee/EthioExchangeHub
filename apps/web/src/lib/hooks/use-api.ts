'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '@/lib/stores/ui-store';
import { useAuth } from '@/lib/auth-context';
import type { RateFilters, HistoricalRateFilters, CompareFilters, BestRatesFilters } from '@/lib/types';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message ?? err.error?.message ?? `HTTP ${res.status}`);
  }

  // Handle binary responses (PDF)
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/pdf')) {
    return res.arrayBuffer() as unknown as T;
  }
  if (contentType?.includes('text/csv')) {
    return res.text() as unknown as T;
  }

  return res.json();
}

// ── Exchange Rates API ─────────────────────────────────────────

export function useLatestRates(filters: RateFilters) {
  const params = new URLSearchParams();
  if (filters.currencyTo) params.set('currencyTo', filters.currencyTo);
  if (filters.bankCode) params.set('bankCode', filters.bankCode);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

  return useQuery({
    queryKey: ['latest-rates', filters],
    queryFn: () => fetchApi<any>(`/exchange-rates/latest?${params}`),
    refetchInterval: 60_000, // Refresh every minute
    staleTime: 30_000,
  });
}

export function useHistoricalRates(filters: HistoricalRateFilters) {
  const params = new URLSearchParams();
  if (filters.currencyTo) params.set('currencyTo', filters.currencyTo);
  if (filters.bankCode) params.set('bankCode', filters.bankCode);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
  if (filters.fromDate) params.set('fromDate', filters.fromDate);
  if (filters.toDate) params.set('toDate', filters.toDate);

  return useQuery({
    queryKey: ['historical-rates', filters],
    queryFn: () => fetchApi<any>(`/exchange-rates/historical?${params}`),
  });
}

export function useCompareRates(filters: CompareFilters) {
  const params = new URLSearchParams();
  if (filters.currencyTo) params.set('currencyTo', filters.currencyTo);
  if (filters.date) params.set('date', filters.date);
  if (filters.banks) params.set('banks', filters.banks);

  return useQuery({
    queryKey: ['compare-rates', filters],
    queryFn: () => fetchApi<any>(`/exchange-rates/compare?${params}`),
  });
}

export function useBestRates(filters: BestRatesFilters) {
  const params = new URLSearchParams();
  if (filters.currencyTo) params.set('currencyTo', filters.currencyTo);
  if (filters.type) params.set('type', filters.type);
  if (filters.date) params.set('date', filters.date);

  return useQuery({
    queryKey: ['best-rates', filters],
    queryFn: () => fetchApi<any>(`/exchange-rates/best?${params}`),
    refetchInterval: 60_000,
  });
}

export function useCurrencies() {
  return useQuery({
    queryKey: ['currencies'],
    queryFn: () => fetchApi<{ data: string[]; base: string }>('/exchange-rates/currencies'),
    staleTime: 300_000, // 5 min
  });
}

export function useExportCsvUrl(filters: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return `${API_URL}/exchange-rates/export/csv?${params}`;
}

// ── Banks API ──────────────────────────────────────────────────

export function useBanks() {
  return useQuery({
    queryKey: ['banks'],
    queryFn: () => fetchApi<{ data: any[] }>('/banks'),
    staleTime: 300_000,
  });
}

export function useBank(code: string) {
  return useQuery({
    queryKey: ['bank', code],
    queryFn: () => fetchApi<any>(`/banks/${code}`),
    enabled: !!code,
  });
}

// ── Rankings API ───────────────────────────────────────────────

export function useRankings(category?: string) {
  const params = category ? `?category=${category}` : '';
  return useQuery({
    queryKey: ['rankings', category],
    queryFn: () => fetchApi<{ data: any[] }>(`/rankings${params}`),
    staleTime: 120_000,
  });
}

// ── Services API ───────────────────────────────────────────────

export function useServices(bankCode?: string, category?: string) {
  const params = new URLSearchParams();
  if (bankCode) params.set('bankCode', bankCode);
  if (category) params.set('category', category);
  const qs = params.toString() ? `?${params}` : '';
  return useQuery({
    queryKey: ['services', bankCode, category],
    queryFn: () => fetchApi<{ data: any[] }>(`/services${qs}`),
    staleTime: 300_000,
  });
}

// ── Alerts API ─────────────────────────────────────────────────

export function useAlerts() {
  const { accessToken } = useAuthStore();
  return useQuery({
    queryKey: ['alerts'],
    queryFn: () => fetchApi<{ data: any[] }>('/rate-alerts'),
    enabled: !!accessToken,
  });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      fetchApi('/rate-alerts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

export function useDeleteAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/rate-alerts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}

// ── Users API ──────────────────────────────────────────────────

export function useProfile() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => fetchApi<any>('/users/me'),
    enabled: isAuthenticated,
  });
}

// ── Helper to get access token from localStorage ───────────────
function useAuthStore() {
  const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return { accessToken };
}
