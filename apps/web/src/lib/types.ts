// ── API Response ───────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details?: Record<string, string[]> } | null;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ── Exchange Rates ─────────────────────────────────────────────
export interface RateRecord {
  id: string;
  bankId: string;
  bankName: string;
  bankCode: string;
  currencyFrom: string;
  currencyTo: string;
  buyRate: number;
  sellRate: number;
  midRate: number | null;
  spread: number;
  source: string;
  effectiveDate: string;
  updatedAt: string;
}

export interface CompareRatesResponse {
  currencyTo: string;
  effectiveDate: string;
  banks: RateRecord[];
  nbeReference: { buyRate: number; sellRate: number; midRate: number } | null;
  summary: RateSummary | null;
}

export interface RateSummary {
  banksCount: number;
  averageBuyRate: number;
  averageSellRate: number;
  bestBuyRate: number;
  bestBuyBank: string;
  bestSellRate: number;
  bestSellBank: string;
  averageSpread: number;
}

export interface BestRatesResponse {
  currencyTo: string;
  type: 'buy' | 'sell';
  best: RateRecord | null;
  worst: RateRecord | null;
  average: number;
  banks: RateRecord[];
  totalBanks: number;
}

export interface CurrenciesResponse {
  data: string[];
  base: string;
}

// ── Banks ──────────────────────────────────────────────────────
export interface Bank {
  id: string;
  code: string;
  name: string;
  swiftCode: string | null;
  logoUrl: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
  sortOrder: number;
  exchangeRates?: RateRecord[];
  services?: BankService[];
}

export interface BankService {
  id: string;
  bankId: string;
  bankName?: string;
  category: string;
  name: string;
  description: string | null;
  interestRate: number | null;
  minBalance: number | null;
  maxAmount: number | null;
  fee: number | null;
  requirements: string | null;
  isActive: boolean;
}

// ── Rankings ───────────────────────────────────────────────────
export interface Ranking {
  id: string;
  category: string;
  bankId: string;
  bankName?: string;
  bankCode?: string;
  score: number;
  rankPosition: number;
  previousRank: number | null;
  criteria: Record<string, unknown> | null;
  effectiveDate: string;
}

// ── Alerts ─────────────────────────────────────────────────────
export interface RateAlert {
  id: string;
  userId: string;
  bankId: string | null;
  bankName?: string;
  currencyFrom: string;
  currencyTo: string;
  condition: 'ABOVE' | 'BELOW';
  targetBuyRate: number | null;
  targetSellRate: number | null;
  isActive: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
}

// ── User Profile ───────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN';
  isVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

// ── Filter & Query Types ────────────────────────────────────────
export interface RateFilters {
  currencyTo?: string;
  bankCode?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface HistoricalRateFilters extends RateFilters {
  fromDate?: string;
  toDate?: string;
}

export interface CompareFilters {
  currencyTo?: string;
  date?: string;
  banks?: string;
}

export interface BestRatesFilters {
  currencyTo?: string;
  type?: 'buy' | 'sell';
  date?: string;
}

// ── UI Types ───────────────────────────────────────────────────
export type TabId = 'latest' | 'historical' | 'compare' | 'best';

export type ThemeMode = 'light' | 'dark' | 'system';

export type SidebarView = 'expanded' | 'collapsed' | 'mobile';

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: string | number;
  adminOnly?: boolean;
  authRequired?: boolean;
}
