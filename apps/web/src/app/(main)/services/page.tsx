'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Puzzle, Search, Building2, Percent, Wallet, CreditCard } from 'lucide-react';
import { LoadingPage } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { BankCards } from '@/components/banks/BankCards';
import { cn, formatCurrency } from '@/lib/utils';

const SERVICE_CATEGORIES = [
  { value: 'ACCOUNT', label: 'Accounts', icon: Wallet },
  { value: 'LOAN', label: 'Loans', icon: CreditCard },
  { value: 'CREDIT_CARD', label: 'Credit Cards', icon: CreditCard },
  { value: 'MOBILE_BANKING', label: 'Mobile Banking', icon: Puzzle },
  { value: 'INTERNET_BANKING', label: 'Internet Banking', icon: Puzzle },
  { value: 'CURRENCY_EXCHANGE', label: 'Currency Exchange', icon: Percent },
  { value: 'MONEY_TRANSFER', label: 'Money Transfer', icon: Puzzle },
  { value: 'SAVINGS', label: 'Savings', icon: Wallet },
  { value: 'INVESTMENT', label: 'Investment', icon: TrendingUpIcon },
  { value: 'INSURANCE', label: 'Insurance', icon: CreditCard },
];

function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1';

async function fetchServices(bankCode?: string, category?: string) {
  const params = new URLSearchParams();
  if (bankCode) params.set('bankCode', bankCode);
  if (category) params.set('category', category);
  const qs = params.toString() ? `?${params}` : '';
  const res = await fetch(`${API_URL}/services${qs}`);
  if (!res.ok) throw new Error('Failed to fetch services');
  return res.json();
}

export default function ServicesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['services', selectedBank, selectedCategory],
    queryFn: () => fetchServices(selectedBank ?? undefined, selectedCategory ?? undefined),
  });

  const services = data?.data ?? [];

  // Group services by bank
  const servicesByBank = services.reduce((acc: Record<string, any[]>, service: any) => {
    const bankKey = service.bankId ?? service.bankName ?? 'Unknown';
    if (!acc[bankKey]) acc[bankKey] = [];
    acc[bankKey].push(service);
    return acc;
  }, {});

  // Filter by search
  const filteredServices = services.filter((s: any) => {
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase()) && !s.description?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Group filtered services
  const filteredByBank = filteredServices.reduce((acc: Record<string, any[]>, service: any) => {
    const bankKey = service.bankId ?? service.bankName ?? 'Unknown';
    if (!acc[bankKey]) acc[bankKey] = [];
    acc[bankKey].push(service);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Bank Services
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Compare products and services across Ethiopian banks
        </p>
      </div>

      {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field pl-9"
        />
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            !selectedCategory
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400',
          )}
        >
          All Services
        </button>
        {SERVICE_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(selectedCategory === cat.value ? null : cat.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                selectedCategory === cat.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Services grouped by bank */}
      {isLoading ? (
        <LoadingPage />
      ) : Object.keys(filteredByBank).length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-12">
          <Puzzle className="h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No services found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(Object.entries(filteredByBank) as [string, any[]][]).map(([bankKey, bankServices]) => (
            <div key={bankKey} className="card">
              <div className="card-header">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {bankServices[0]?.bankName ?? bankKey}
                  </h3>
                  <span className="badge-blue text-xs">{bankServices.length} services</span>
                </div>
              </div>
              <div className="card-body">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {bankServices.map((service: any) => (
                    <div key={service.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {service.name}
                          </p>
                          {service.description && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {service.interestRate != null && (
                          <span className="badge-green text-xs">
                            {service.interestRate}% APR
                          </span>
                        )}
                        {service.minBalance != null && (
                          <span className="badge-blue text-xs">
                            Min: {formatCurrency(Number(service.minBalance))}
                          </span>
                        )}
                        {service.fee != null && (
                          <span className="badge-red text-xs">
                            Fee: {formatCurrency(Number(service.fee))}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
