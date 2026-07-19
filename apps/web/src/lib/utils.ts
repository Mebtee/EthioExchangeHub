import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'ETB'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  }).format(amount);
}

export function formatRate(amount: number): string {
  return amount.toFixed(4);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

export function calculateSpread(buyRate: number, sellRate: number): number {
  return Math.round((sellRate - buyRate) * 10000) / 10000;
}

export function calculateMidRate(buyRate: number, sellRate: number): number {
  return Math.round(((buyRate + sellRate) / 2) * 10000) / 10000;
}

export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    ETB: 'Br',
    USD: '$',
    EUR: '€',
    GBP: '£',
    SAR: '﷼',
    AED: 'د.إ',
    CNY: '¥',
    JPY: '¥',
    CHF: 'Fr',
  };
  return symbols[currency] ?? currency;
}

export function getCurrencyFlag(currency: string): string {
  const flags: Record<string, string> = {
    ETB: '🇪🇹',
    USD: '🇺🇸',
    EUR: '🇪🇺',
    GBP: '🇬🇧',
    SAR: '🇸🇦',
    AED: '🇦🇪',
    CNY: '🇨🇳',
    JPY: '🇯🇵',
    CHF: '🇨🇭',
  };
  return flags[currency] ?? '';
}

export function getCurrencyColor(currency: string): string {
  const colors: Record<string, string> = {
    ETB: '#2563eb',
    USD: '#16a34a',
    EUR: '#2563eb',
    GBP: '#dc2626',
    SAR: '#059669',
    AED: '#d97706',
    CNY: '#dc2626',
    JPY: '#9333ea',
    CHF: '#0891b2',
  };
  return colors[currency] ?? '#6b7280';
}

export function getBankLogoUrl(code: string): string {
  return `/banks/${code.toLowerCase()}.svg`;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);
  return { data, meta: { page, limit, total, totalPages } };
}
