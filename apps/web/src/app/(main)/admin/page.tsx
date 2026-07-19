'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { cn, formatDateTime, formatDate } from '@/lib/utils';
import { StatCard } from '@/components/common/StatCard';
import { LoadingPage, TableSkeleton } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { Pagination } from '@/components/common/Pagination';
import React from 'react';
import {
  ShieldCheck, LayoutDashboard, Radio, Edit3, Building2, Users,
  CreditCard, Medal, BarChart3, Bell, FileText, RefreshCw,
  Search, CheckCircle, XCircle, AlertTriangle, Activity, Database,
  DollarSign, TrendingUp, UserPlus, Star, ToggleLeft, ToggleRight,
  Trash2, Plus, Save, Eye,
} from 'lucide-react';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1';

// ── API Helpers ────────────────────────────────────────────────
async function fetchAdmin(endpoint: string) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/admin${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Admin API error: ${res.status}`);
  return res.json();
}

async function postAdmin(endpoint: string, data?: any) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/admin${endpoint}`, {
    method: data ? 'POST' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  if (!res.ok) throw new Error(`Admin API error: ${res.status}`);
  return res.json();
}

async function patchAdmin(endpoint: string, data: any) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/admin${endpoint}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Admin API error: ${res.status}`);
  return res.json();
}

async function deleteAdmin(endpoint: string) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}/admin${endpoint}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Admin API error: ${res.status}`);
  return res.json();
}

// ── Tab Configuration ──────────────────────────────────────────
interface AdminTab {
  id: string;
  label: string;
  icon: any;
  color: string;
  description: string;
}

const ADMIN_TABS: AdminTab[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, color: 'text-blue-600', description: 'System overview and key metrics' },
  { id: 'scraper', label: 'Scraper Monitor', icon: Radio, color: 'text-green-600', description: 'Monitor and manage data scraping' },
  { id: 'rates', label: 'Rate Editor', icon: Edit3, color: 'text-purple-600', description: 'Create, edit, and manage exchange rates' },
  { id: 'banks', label: 'Banks', icon: Building2, color: 'text-indigo-600', description: 'Manage bank information and settings' },
  { id: 'users', label: 'Users', icon: Users, color: 'text-amber-600', description: 'User management and permissions' },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard, color: 'text-rose-600', description: 'Manage user subscriptions and tiers' },
  { id: 'rankings', label: 'Rankings', icon: Medal, color: 'text-orange-600', description: 'Manage bank ranking data' },
  { id: 'revenue', label: 'Revenue', icon: DollarSign, color: 'text-emerald-600', description: 'Revenue analytics and MRR tracking' },
  { id: 'alerts', label: 'Alert Queue', icon: Bell, color: 'text-red-600', description: 'Monitor and manage rate alerts' },
  { id: 'logs', label: 'Logs', icon: FileText, color: 'text-slate-600', description: 'System audit logs and scrape history' },
];

// ── Admin Page ─────────────────────────────────────────────────
export default function AdminPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="card max-w-md p-12 text-center">
          <ShieldCheck className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600" />
          <h3 className="mt-6 text-xl font-bold text-gray-900 dark:text-gray-100">Admin access required</h3>
          <p className="mt-2 text-sm text-gray-500">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar Navigation */}
      <aside className="hidden w-56 flex-shrink-0 lg:block">
        <nav className="sticky top-20 space-y-1">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Admin Modules</p>
          {ADMIN_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100',
                )}
              >
                <Icon className={cn('h-4 w-4', activeTab === tab.id ? tab.color : '')} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile tab selector */}
      <div className="w-full lg:hidden">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          className="input-field mb-4 py-2.5"
        >
          {ADMIN_TABS.map((tab) => (
            <option key={tab.id} value={tab.id}>{tab.label}</option>
          ))}
        </select>
      </div>

      {/* Main Content */}
      <div className="min-w-0 flex-1">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            {React.createElement(ADMIN_TABS.find((t) => t.id === activeTab)?.icon ?? LayoutDashboard, {
              className: cn('h-6 w-6', ADMIN_TABS.find((t) => t.id === activeTab)?.color ?? ''),
            })}
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {ADMIN_TABS.find((t) => t.id === activeTab)?.label}
              </h1>
              <p className="text-sm text-gray-500">{ADMIN_TABS.find((t) => t.id === activeTab)?.description}</p>
            </div>
          </div>
        </div>

        {activeTab === 'overview' && <OverviewModule />}
        {activeTab === 'scraper' && <ScraperModule />}
        {activeTab === 'rates' && <RateEditorModule />}
        {activeTab === 'banks' && <BankManagementModule />}
        {activeTab === 'users' && <UserManagementModule />}
        {activeTab === 'subscriptions' && <SubscriptionModule />}
        {activeTab === 'rankings' && <RankingsModule />}
        {activeTab === 'revenue' && <RevenueModule />}
        {activeTab === 'alerts' && <AlertQueueModule />}
        {activeTab === 'logs' && <LogsModule />}
      </div>
    </div>
  );
}

// Need to import React for createElement
// ═══════════════════════════════════════════════════════════════
// OVERVIEW MODULE
// ═══════════════════════════════════════════════════════════════
function OverviewModule() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => fetchAdmin('/dashboard'),
    refetchInterval: 30_000,
  });

  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;

  const stats = data ?? {};

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Total Users" value={stats.totalUsers ?? 0} icon={<Users className="h-5 w-5" />} color="blue" />
        <StatCard title="Active Banks" value={stats.totalBanks ?? 0} icon={<Building2 className="h-5 w-5" />} color="indigo" />
        <StatCard title="Total Rates" value={stats.totalRates ?? 0} icon={<Activity className="h-5 w-5" />} color="purple" />
        <StatCard title="Active Alerts" value={stats.activeAlerts ?? 0} icon={<Bell className="h-5 w-5" />} color="red" />
        <StatCard title="Subscriptions" value={stats.totalSubscriptions ?? 0} icon={<CreditCard className="h-5 w-5" />} color="green" />
        <StatCard title="Scrapes" value={stats.totalScrapes ?? 0} icon={<Database className="h-5 w-5" />} color="amber" />
      </div>

      <div className="card p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          {ADMIN_TABS.filter((t) => t.id !== 'overview').map((tab) => {
            const Icon = tab.icon;
            return (
              <a
                key={tab.id}
                href={`#${tab.id}`}
                className="btn-secondary text-sm"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCRAPER MONITOR MODULE
// ═══════════════════════════════════════════════════════════════
function ScraperModule() {
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-scraper'],
    queryFn: async () => {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/scraper/status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to fetch scraper status');
      return res.json();
    },
    refetchInterval: 15_000,
  });

  const handleTrigger = async () => {
    setIsScraping(true);
    setScrapeResult(null);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/scraper/trigger`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to trigger scrape');
      const result = await res.json();
      setScrapeResult(`✅ Scrape completed — ${result.results?.length ?? 0} banks scraped`);
    } catch (err) {
      setScrapeResult(`❌ Error: ${(err as Error).message}`);
    } finally {
      setIsScraping(false);
    }
  };

  const system = data?.system ?? {};
  const scheduler = data?.scheduler ?? {};
  const banks = data?.banks ?? [];
  const lastResults = data?.lastResults ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Banks" value={system.totalBanks ?? 0} icon={<Building2 className="h-5 w-5" />} color="blue" />
        <StatCard title="Active" value={system.activeBanks ?? 0} icon={<Radio className="h-5 w-5" />} color="green" />
        <StatCard title="Total Runs" value={scheduler.totalRuns ?? 0} icon={<Activity className="h-5 w-5" />} color="purple" />
        <StatCard title="Success Rate" value={scheduler.totalRuns > 0 ? `${Math.round((scheduler.totalSuccesses / scheduler.totalRuns) * 100)}%` : '—'} icon={<CheckCircle className="h-5 w-5" />} color="amber" />
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Scraper Control</h3>
          <div className="flex items-center gap-2">
            {scheduler.nextScheduledRunEAT && (
              <span className="text-xs text-gray-400">Next: {scheduler.nextScheduledRunEAT}</span>
            )}
            <button onClick={handleTrigger} disabled={isScraping} className="btn-primary text-xs">
              <RefreshCw className={cn('h-3.5 w-3.5', isScraping && 'animate-spin')} />
              {isScraping ? 'Running...' : 'Trigger'}
            </button>
          </div>
        </div>
        <div className="card-body">
          {scrapeResult && (
            <div className={cn('mb-4 rounded-lg px-4 py-2 text-sm', scrapeResult.startsWith('❌') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700')}>
              {scrapeResult}
            </div>
          )}
          {isLoading ? <TableSkeleton /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500 dark:border-gray-700">
                    <th className="pb-3 pr-4">Bank</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Method</th>
                    <th className="pb-3 pr-4">Currencies</th>
                    <th className="pb-3">Enabled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {banks.map((bank: any) => (
                    <tr key={bank.slug} className="text-sm">
                      <td className="py-3 pr-4">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{bank.name}</span>
                        <span className="ml-2 text-xs text-gray-400">{bank.slug}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={bank.isActive ? 'badge-green text-xs' : 'badge-red text-xs'}>
                          {bank.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-500">{bank.method}</td>
                      <td className="py-3 pr-4 text-gray-500">{bank.supportedCurrencies?.join(', ') ?? '—'}</td>
                      <td className="py-3">
                        <span className={bank.isEnabled ? 'badge-green text-xs' : 'badge-gray text-xs'}>
                          {bank.isEnabled ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recent Results */}
      {lastResults.length > 0 && (
        <div className="card">
          <div className="card-header"><h3 className="font-semibold text-gray-900 dark:text-gray-100">Last Run Results</h3></div>
          <div className="card-body">
            {lastResults.map((r: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between border-b border-gray-100 py-2 last:border-0 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  {r.success ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                  <span className="text-sm font-medium">{r.bank}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{r.ratesCount ?? 0} rates</span>
                  <span>{r.duration ?? '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RATE EDITOR MODULE
// ═══════════════════════════════════════════════════════════════
function RateEditorModule() {
  const [page, setPage] = useState(1);
  const [bankFilter, setBankFilter] = useState('');
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-rates', page, bankFilter],
    queryFn: () => fetchAdmin(`/rates?page=${page}&limit=15${bankFilter ? `&bankCode=${bankFilter}` : ''}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdmin(`/rates/${id}`),
    onSuccess: () => { refetch(); },
  });

  const rates = data?.data ?? [];
  const banks = data?.banks ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select value={bankFilter} onChange={(e) => { setBankFilter(e.target.value); setPage(1); }}
          className="input-field w-48 py-2 text-sm">
          <option value="">All Banks</option>
          {banks.map((b: any) => (
            <option key={b.code} value={b.code}>{b.name} ({b.code})</option>
          ))}
        </select>
        <button onClick={() => refetch()} className="btn-ghost p-2"><RefreshCw className="h-4 w-4" /></button>
      </div>

      {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

      {isLoading ? <TableSkeleton /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-900">
                  <th className="px-4 py-3">Bank</th>
                  <th className="px-4 py-3">Currency</th>
                  <th className="px-4 py-3 text-right">Buy Rate</th>
                  <th className="px-4 py-3 text-right">Sell Rate</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rates.map((rate: any) => (
                  <tr key={rate.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="px-4 py-3 font-medium">{rate.bank?.name ?? rate.bankId}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold">{rate.currencyTo}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-green-600">{Number(rate.buyRate).toFixed(4)}</td>
                    <td className="px-4 py-3 text-right font-mono text-blue-600">{Number(rate.sellRate).toFixed(4)}</td>
                    <td className="px-4 py-3 text-gray-500">{rate.source}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(rate.effectiveDate)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteMutation.mutate(rate.id)}
                        className="btn-ghost p-1.5 text-red-500 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data?.meta && (
            <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
              <Pagination {...data.meta} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}

      {rates.length === 0 && !isLoading && (
        <div className="card flex flex-col items-center justify-center p-12">
          <Edit3 className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">No exchange rates found</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BANK MANAGEMENT MODULE
// ═══════════════════════════════════════════════════════════════
function BankManagementModule() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-banks'],
    queryFn: () => fetchAdmin('/banks?limit=50'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => patchAdmin(`/banks/${id}`, data),
    onSuccess: () => refetch(),
  });

  const banks = data?.data ?? [];

  return (
    <div className="space-y-4">
      {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

      {isLoading ? <TableSkeleton /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banks.map((bank: any) => (
            <div key={bank.id} className={cn('card p-4', !bank.isActive && 'opacity-60')}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                    {bank.code?.slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{bank.name}</h3>
                    <p className="text-xs text-gray-400">{bank.code}</p>
                  </div>
                </div>
                <button
                  onClick={() => updateMutation.mutate({ id: bank.id, isActive: !bank.isActive })}
                  className={cn('rounded-lg p-1.5 transition-colors', bank.isActive ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100')}
                >
                  {bank.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded bg-gray-50 p-2 dark:bg-gray-800">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{bank._count?.exchangeRates ?? 0}</p>
                  <p className="text-gray-400">Rates</p>
                </div>
                <div className="rounded bg-gray-50 p-2 dark:bg-gray-800">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{bank._count?.services ?? 0}</p>
                  <p className="text-gray-400">Services</p>
                </div>
                <div className="rounded bg-gray-50 p-2 dark:bg-gray-800">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{bank._count?.rateAlerts ?? 0}</p>
                  <p className="text-gray-400">Alerts</p>
                </div>
              </div>

              {bank.swiftCode && (
                <p className="mt-2 text-[10px] text-gray-400 font-mono">SWIFT: {bank.swiftCode}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// USER MANAGEMENT MODULE
// ═══════════════════════════════════════════════════════════════
function UserManagementModule() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () => fetchAdmin(`/users?page=${page}&limit=15${search ? `&search=${search}` : ''}`),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: any) => patchAdmin(`/users/${id}/role`, { role }),
    onSuccess: () => refetch(),
  });

  const users = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Search users..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-9 py-2 text-sm"
          />
        </div>
      </div>

      {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

      {isLoading ? <TableSkeleton /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-900">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Verified</th>
                  <th className="px-4 py-3 text-right">Alerts</th>
                  <th className="px-4 py-3 text-right">Subs</th>
                  <th className="px-4 py-3 text-right">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{user.fullName}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={cn('badge text-xs', user.role === 'ADMIN' ? 'badge-purple' : 'badge-blue')}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.isVerified ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-400" />}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{user._count?.rateAlerts ?? 0}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{user._count?.subscriptions ?? 0}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">{formatDate(user.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => roleMutation.mutate({ id: user.id, role: user.role === 'ADMIN' ? 'USER' : 'ADMIN' })}
                        className={cn('btn-ghost rounded-lg p-1.5 text-xs', user.role === 'ADMIN' ? 'text-amber-600' : 'text-gray-400')}
                        title={user.role === 'ADMIN' ? 'Demote to User' : 'Promote to Admin'}
                      >
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data?.meta && (
            <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
              <Pagination {...data.meta} onPageChange={setPage} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUBSCRIPTION MODULE
// ═══════════════════════════════════════════════════════════════
function SubscriptionModule() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-subscriptions', page],
    queryFn: () => fetchAdmin(`/subscriptions?page=${page}&limit=15`),
  });

  const subscriptions = data?.data ?? [];

  const tierColors: Record<string, string> = {
    FREE: 'badge-blue', BASIC: 'badge-green', PREMIUM: 'badge-purple', ENTERPRISE: 'badge-red',
  };

  return (
    <div className="space-y-4">
      {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
      {isLoading ? <TableSkeleton /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-900">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Bank</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Notif</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {subscriptions.map((sub: any) => (
                  <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{sub.user?.fullName ?? sub.userId}</span>
                      <p className="text-xs text-gray-400">{sub.user?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('badge text-xs', tierColors[sub.tier] ?? 'badge-blue')}>{sub.tier}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{sub.bank?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{sub.service?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{sub.notificationType}</td>
                    <td className="px-4 py-3">
                      <span className={sub.isActive ? 'badge-green text-xs' : 'badge-red text-xs'}>
                        {sub.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{sub.expiresAt ? formatDate(sub.expiresAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data?.meta && <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800"><Pagination {...data.meta} onPageChange={setPage} /></div>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RANKINGS MODULE
// ═══════════════════════════════════════════════════════════════
function RankingsModule() {
  const [category, setCategory] = useState('EXCHANGE_RATE');
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-rankings', category],
    queryFn: () => fetchAdmin(`/rankings?category=${category}`),
  });

  const rankings = data?.data ?? [];

  const CATEGORIES = [
    { value: 'EXCHANGE_RATE', label: 'Exchange Rates', color: 'text-blue-600' },
    { value: 'INTEREST_RATE', label: 'Interest Rates', color: 'text-green-600' },
    { value: 'SERVICE_QUALITY', label: 'Service Quality', color: 'text-purple-600' },
    { value: 'CUSTOMER_SATISFACTION', label: 'Customer Satisfaction', color: 'text-amber-600' },
    { value: 'DIGITAL_BANKING', label: 'Digital Banking', color: 'text-indigo-600' },
    { value: 'OVERALL', label: 'Overall', color: 'text-rose-600' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button key={cat.value} onClick={() => setCategory(cat.value)}
            className={cn('rounded-lg px-3 py-1.5 text-xs font-medium transition-all', category === cat.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400')}>
            {cat.label}
          </button>
        ))}
      </div>

      {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

      {isLoading ? <TableSkeleton /> : rankings.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-12">
          <Medal className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">No rankings for this category</p>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            {rankings.sort((a: any, b: any) => a.rankPosition - b.rankPosition).map((ranking: any, idx: number) => (
              <div key={ranking.id} className={cn('flex items-center gap-4 rounded-lg p-3', idx < 3 && 'bg-gradient-to-r from-primary-50/50 to-transparent dark:from-primary-950/10')}>
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold', idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-gray-100 text-gray-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-400')}>
                  #{ranking.rankPosition}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{ranking.bank?.name ?? ranking.bankId}</p>
                  <p className="text-xs text-gray-400">{ranking.bank?.code}</p>
                </div>
                <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{Number(ranking.score).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// REVENUE MODULE
// ═══════════════════════════════════════════════════════════════
function RevenueModule() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-revenue'],
    queryFn: () => fetchAdmin('/revenue'),
    refetchInterval: 60_000,
  });

  if (isLoading) return <LoadingPage />;
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;

  const subs = data?.subscriptions ?? {};
  const users = data?.users ?? {};
  const activity = data?.activity ?? {};

  return (
    <div className="space-y-6">
      {/* MRR Section */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Monthly Recurring Revenue" value={`$${subs.estimatedMrr?.toLocaleString() ?? '0'}`}
          icon={<DollarSign className="h-5 w-5" />} color="green" trend="up" trendValue="+12%" />
        <StatCard title="Annual Run Rate" value={`$${subs.estimatedArr?.toLocaleString() ?? '0'}`}
          icon={<TrendingUp className="h-5 w-5" />} color="blue" />
        <StatCard title="Active Subscriptions" value={subs.active ?? 0}
          icon={<CreditCard className="h-5 w-5" />} color="purple" />
      </div>

      {/* Breakdown */}
      <div className="card p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Subscription Breakdown</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { tier: 'BASIC', count: subs.breakdown?.basic ?? 0, price: 9.99, color: 'bg-green-500' },
            { tier: 'PREMIUM', count: subs.breakdown?.premium ?? 0, price: 29.99, color: 'bg-purple-500' },
            { tier: 'ENTERPRISE', count: subs.breakdown?.enterprise ?? 0, price: 99.99, color: 'bg-amber-500' },
          ].map((item) => (
            <div key={item.tier} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.tier}</span>
                <span className="text-xs text-gray-400">${item.price}/mo</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{item.count}</p>
              <p className="text-xs text-gray-500">subscribers — ${(item.count * item.price).toLocaleString()} MRR</p>
              <div className="mt-3 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                <div className={cn('h-full rounded-full transition-all', item.color)} style={{ width: `${subs.active > 0 ? (item.count / subs.active) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Users & Activity */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500">Total Users</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{users.total ?? 0}</p>
          <p className="text-xs text-green-600">+{users.newThisMonth ?? 0} this month</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500">Alerts Created (Month)</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activity.alertsCreatedThisMonth ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-gray-500">Scrape Success Rate</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activity.scrapeSuccessRate ?? '0%'}</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ALERT QUEUE MODULE
// ═══════════════════════════════════════════════════════════════
function AlertQueueModule() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-alerts', page, statusFilter],
    queryFn: () => fetchAdmin(`/alerts?page=${page}&limit=15${statusFilter ? `&status=${statusFilter}` : ''}`),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => postAdmin(`/alerts/${id}/toggle`),
    onSuccess: () => refetch(),
  });

  const alerts = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['', 'active', 'inactive'].map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={cn('rounded-lg px-3 py-1.5 text-xs font-medium', statusFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800')}>
            {s || 'All'}
          </button>
        ))}
      </div>
      {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
      {isLoading ? <TableSkeleton /> : alerts.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-12">
          <Bell className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">No alerts in queue</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-900">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Currency</th>
                  <th className="px-4 py-3">Condition</th>
                  <th className="px-4 py-3 text-right">Target Buy</th>
                  <th className="px-4 py-3 text-right">Target Sell</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {alerts.map((alert: any) => (
                  <tr key={alert.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium">{alert.user?.fullName ?? alert.userId}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{alert.currencyTo}</td>
                    <td className="px-4 py-3">
                      <span className={cn('badge text-xs', alert.condition === 'ABOVE' ? 'badge-green' : 'badge-red')}>
                        {alert.condition}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{alert.targetBuyRate ? Number(alert.targetBuyRate).toFixed(4) : '—'}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{alert.targetSellRate ? Number(alert.targetSellRate).toFixed(4) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={alert.isActive ? 'badge-green text-xs' : 'badge-red text-xs'}>
                        {alert.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => toggleMutation.mutate(alert.id)}
                        className="btn-ghost rounded-lg p-1.5 text-gray-400 hover:text-primary-600"
                        title="Toggle active/inactive">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data?.meta && <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800"><Pagination {...data.meta} onPageChange={setPage} /></div>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOGS MODULE
// ═══════════════════════════════════════════════════════════════
function LogsModule() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-logs', page, statusFilter],
    queryFn: () => fetchAdmin(`/logs?page=${page}&limit=25${statusFilter ? `&status=${statusFilter}` : ''}`),
    refetchInterval: 10_000,
  });

  const logs = data?.data ?? [];

  const statusColors: Record<string, string> = {
    SUCCESS: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300',
    FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300',
    PARTIAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['', 'SUCCESS', 'FAILED', 'PARTIAL'].map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={cn('rounded-lg px-3 py-1.5 text-xs font-medium', statusFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800')}>
            {s || 'All'}
          </button>
        ))}
        <button onClick={() => refetch()} className="btn-ghost ml-auto p-2"><RefreshCw className="h-4 w-4" /></button>
      </div>
      {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
      {isLoading ? <TableSkeleton rows={8} /> : logs.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-12">
          <FileText className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">No logs found</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-white dark:bg-gray-900">
                <tr className="border-b border-gray-200 text-[10px] font-semibold uppercase text-gray-500 dark:border-gray-700">
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Bank</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Records</th>
                  <th className="px-3 py-2 text-right">Duration</th>
                  <th className="px-3 py-2">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                    <td className="px-3 py-2 font-medium">{log.bank?.name ?? log.bankId ?? 'System'}</td>
                    <td className="px-3 py-2">
                      <span className={cn('inline-block rounded px-1.5 py-0.5 font-medium', statusColors[log.status] ?? 'bg-gray-100 text-gray-600')}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-500">{log.recordsCount ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : '—'}</td>
                    <td className="px-3 py-2 text-red-500 max-w-[200px] truncate" title={log.errorMessage ?? ''}>
                      {log.errorMessage ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data?.meta && <div className="border-t border-gray-100 px-3 py-2 dark:border-gray-800"><Pagination {...data.meta} onPageChange={setPage} /></div>}
        </div>
      )}
    </div>
  );
}
