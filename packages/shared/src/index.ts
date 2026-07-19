// ── Bank Identifiers ───────────────────────────────────────────
export const ETHIOPIAN_BANKS = [
  { id: 'CBE', name: 'Commercial Bank of Ethiopia', code: 'CBETETAA' },
  { id: 'AWIN', name: 'Awash International Bank', code: 'AWINETAA' },
  { id: 'DASH', name: 'Dashen Bank', code: 'DASHETAA' },
  { id: 'BOA', name: 'Bank of Abyssinia', code: 'ABYSETAA' },
  { id: 'WB', name: 'Wegagen Bank', code: 'WEGAETAA' },
  { id: 'UB', name: 'United Bank', code: 'UNUNETAA' },
  { id: 'NIB', name: 'Nib International Bank', code: 'NIBIETAA' },
  { id: 'BIB', name: 'Berhan International Bank', code: 'BIBTETAA' },
  { id: 'LIB', name: 'Lion International Bank', code: 'LIONETAA' },
  { id: 'ZEMEN', name: 'Zemen Bank', code: 'ZEMEETAA' },
  { id: 'AB', name: 'Abay Bank', code: 'ABAYETAA' },
  { id: 'BUNNA', name: 'Bunna International Bank', code: 'BUNNETAA' },
  { id: 'DB', name: 'Debub Global Bank', code: 'DGBEETAA' },
  { id: 'ENAT', name: 'Enat Bank', code: 'ENATETAA' },
  { id: 'COOP', name: 'Cooperative Bank of Oromia', code: 'CBORETAA' },
  { id: 'SM', name: 'Shem Bank', code: 'SHEMETAA' },
  { id: 'HIB', name: 'Hijira Bank', code: 'HIJIETAA' },
  { id: 'TSB', name: 'Tseday Bank', code: 'TSEDETAA' },
  { id: 'AMHARA', name: 'Amhara Bank', code: 'AMHAETAA' },
  { id: 'GADA', name: 'Gada Bank', code: 'GADAETAA' },
  { id: 'OMO', name: 'Omo Bank', code: 'OMOIETAA' },
] as const;

export type BankId = (typeof ETHIOPIAN_BANKS)[number]['id'];

// ── Account Types ──────────────────────────────────────────────
export const ACCOUNT_TYPES = ['SAVINGS', 'CHECKING', 'CREDIT', 'LOAN'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

// ── Transaction Types ──────────────────────────────────────────
export const TRANSACTION_TYPES = [
  'TRANSFER',
  'PAYMENT',
  'DEPOSIT',
  'WITHDRAWAL',
  'FEE',
  'INTEREST',
  'REFUND',
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_STATUSES = [
  'PENDING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'REVERSED',
] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

// ── Currency ───────────────────────────────────────────────────
export const CURRENCIES = ['ETB', 'USD', 'EUR', 'GBP'] as const;
export type Currency = (typeof CURRENCIES)[number];

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

// ── Bank Account ───────────────────────────────────────────────
export interface BankAccount {
  id: string;
  bankId: BankId;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  accountType: AccountType;
  currency: Currency;
  balance: number;
  isActive: boolean;
  lastSyncAt: string | null;
}

// ── Transaction ────────────────────────────────────────────────
export interface Transaction {
  id: string;
  transactionId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: Currency;
  fee: number;
  description: string | null;
  reference: string | null;
  fromAccount: TransactionAccount | null;
  toAccount: TransactionAccount | null;
  initiatedAt: string;
  completedAt: string | null;
}

export interface TransactionAccount {
  bankId: BankId;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
}

// ── User ───────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  createdAt: string;
}

// ── Enums used in Prisma ───────────────────────────────────────
export enum BankProvider {
  CBE = 'CBE',
  AWIN = 'AWIN',
  DASH = 'DASH',
  BOA = 'BOA',
  WB = 'WB',
  UB = 'UB',
  NIB = 'NIB',
  BIB = 'BIB',
  LIB = 'LIB',
  ZEMEN = 'ZEMEN',
  AB = 'AB',
  BUNNA = 'BUNNA',
  DB = 'DB',
  ENAT = 'ENAT',
  COOP = 'COOP',
  SM = 'SM',
  HIB = 'HIB',
  TSB = 'TSB',
  AMHARA = 'AMHARA',
  GADA = 'GADA',
  OMO = 'OMO',
}
