// ── Currency ───────────────────────────────────────────────────
export const CURRENCIES = ['ETB', 'USD', 'EUR', 'GBP'] as const;
export type Currency = (typeof CURRENCIES)[number];

// ── User Role ──────────────────────────────────────────────────
export const USER_ROLES = ['USER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// ── Service Categories ─────────────────────────────────────────
export const SERVICE_CATEGORIES = [
  'ACCOUNT',
  'LOAN',
  'CREDIT_CARD',
  'MOBILE_BANKING',
  'INTERNET_BANKING',
  'CURRENCY_EXCHANGE',
  'MONEY_TRANSFER',
  'SAVINGS',
  'INVESTMENT',
  'INSURANCE',
] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

// ── Alert Condition ────────────────────────────────────────────
export const ALERT_CONDITIONS = ['ABOVE', 'BELOW'] as const;
export type AlertCondition = (typeof ALERT_CONDITIONS)[number];

// ── Notification Type ──────────────────────────────────────────
export const NOTIFICATION_TYPES = ['EMAIL', 'SMS', 'PUSH'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// ── Scrape Status ──────────────────────────────────────────────
export const SCRAPE_STATUSES = ['SUCCESS', 'FAILED', 'PARTIAL'] as const;
export type ScrapeStatus = (typeof SCRAPE_STATUSES)[number];

// ── Rank Categories ────────────────────────────────────────────
export const RANK_CATEGORIES = [
  'EXCHANGE_RATE',
  'INTEREST_RATE',
  'SERVICE_QUALITY',
  'CUSTOMER_SATISFACTION',
  'DIGITAL_BANKING',
  'OVERALL',
] as const;
export type RankCategory = (typeof RANK_CATEGORIES)[number];

// ── Subscription Tiers ─────────────────────────────────────────
export const SUBSCRIPTION_TIERS = ['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE'] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

// ── Ethiopian Banks Reference ──────────────────────────────────
export interface BankInfo {
  id: string;
  code: string;
  name: string;
  swiftCode: string;
}

export const ETHIOPIAN_BANKS: BankInfo[] = [
  { id: 'CBE', code: 'CBE', name: 'Commercial Bank of Ethiopia', swiftCode: 'CBETETAA' },
  { id: 'AWIN', code: 'AWIN', name: 'Awash International Bank', swiftCode: 'AWINETAA' },
  { id: 'DASH', code: 'DASH', name: 'Dashen Bank', swiftCode: 'DASHETAA' },
  { id: 'BOA', code: 'BOA', name: 'Bank of Abyssinia', swiftCode: 'ABYSETAA' },
  { id: 'WB', code: 'WB', name: 'Wegagen Bank', swiftCode: 'WEGAETAA' },
  { id: 'UB', code: 'UB', name: 'United Bank', swiftCode: 'UNUNETAA' },
  { id: 'NIB', code: 'NIB', name: 'Nib International Bank', swiftCode: 'NIBIETAA' },
  { id: 'BIB', code: 'BIB', name: 'Berhan International Bank', swiftCode: 'BIBTETAA' },
  { id: 'LIB', code: 'LIB', name: 'Lion International Bank', swiftCode: 'LIONETAA' },
  { id: 'ZEMEN', code: 'ZEMEN', name: 'Zemen Bank', swiftCode: 'ZEMEETAA' },
  { id: 'AB', code: 'AB', name: 'Abay Bank', swiftCode: 'ABAYETAA' },
  { id: 'BUNNA', code: 'BUNNA', name: 'Bunna International Bank', swiftCode: 'BUNNETAA' },
  { id: 'DB', code: 'DB', name: 'Debub Global Bank', swiftCode: 'DGBEETAA' },
  { id: 'ENAT', code: 'ENAT', name: 'Enat Bank', swiftCode: 'ENATETAA' },
  { id: 'COOP', code: 'COOP', name: 'Cooperative Bank of Oromia', swiftCode: 'CBORETAA' },
  { id: 'SM', code: 'SM', name: 'Shem Bank', swiftCode: 'SHEMETAA' },
  { id: 'HIB', code: 'HIB', name: 'Hijira Bank', swiftCode: 'HIJIETAA' },
  { id: 'TSB', code: 'TSB', name: 'Tseday Bank', swiftCode: 'TSEDETAA' },
  { id: 'AMHARA', code: 'AMHARA', name: 'Amhara Bank', swiftCode: 'AMHAETAA' },
  { id: 'GADA', code: 'GADA', name: 'Gada Bank', swiftCode: 'GADAETAA' },
  { id: 'OMO', code: 'OMO', name: 'Omo Bank', swiftCode: 'OMOIETAA' },
] as const;

export type BankCode = (typeof ETHIOPIAN_BANKS)[number]['code'];

// ── API Response ───────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── Bank ───────────────────────────────────────────────────────
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
}

// ── Exchange Rate ──────────────────────────────────────────────
export interface ExchangeRate {
  id: string;
  bankId: string;
  bankName?: string;
  currencyFrom: Currency;
  currencyTo: Currency;
  buyRate: number;
  sellRate: number;
  midRate: number | null;
  source: string;
  effectiveDate: string;
}

// ── User Profile ───────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

// ── Bank Service ───────────────────────────────────────────────
export interface BankService {
  id: string;
  bankId: string;
  bankName?: string;
  category: ServiceCategory;
  name: string;
  description: string | null;
  interestRate: number | null;
  minBalance: number | null;
  maxAmount: number | null;
  fee: number | null;
  requirements: string | null;
  isActive: boolean;
}

// ── Rate Alert ─────────────────────────────────────────────────
export interface RateAlert {
  id: string;
  userId: string;
  bankId: string | null;
  currencyFrom: Currency;
  currencyTo: Currency;
  condition: AlertCondition;
  targetBuyRate: number | null;
  targetSellRate: number | null;
  isActive: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
}

// ── Ranking ────────────────────────────────────────────────────
export interface Ranking {
  id: string;
  category: RankCategory;
  bankId: string;
  bankName?: string;
  score: number;
  rankPosition: number;
  previousRank: number | null;
  criteria: Record<string, unknown> | null;
  effectiveDate: string;
}

// ── Subscription ───────────────────────────────────────────────
export interface Subscription {
  id: string;
  userId: string;
  bankId: string | null;
  serviceId: string | null;
  tier: SubscriptionTier;
  notificationType: NotificationType;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

// ── Scrape Log ─────────────────────────────────────────────────
export interface ScrapeLog {
  id: string;
  bankId: string | null;
  sourceUrl: string | null;
  status: ScrapeStatus;
  recordsCount: number | null;
  errorMessage: string | null;
  durationMs: number | null;
  metadata: Record<string, unknown> | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}
