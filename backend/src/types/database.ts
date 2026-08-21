/**
 * Database row types — REALIGNED to the live Supabase schema (Phase 2C).
 *
 * Verified against the configured project via the PostgREST OpenAPI endpoint.
 * The live database is the source of truth; the previous spec-derived shapes
 * (numeric `id` PKs, `bank_id`, `scraper_id`, `slug`, `currency`, ...) did not
 * match reality and have been replaced.
 *
 * Column names are snake_case to match the database. `string` maps to
 * text/uuid/timestamptz/date columns; `number` to numeric/integer; `boolean`
 * to boolean. Nullable columns (not listed as NOT NULL in the schema) are
 * typed `| null`.
 *
 * Declared as `type` aliases (not `interface`) deliberately — TypeScript only
 * gives type aliases/object literals an implicit index signature, which
 * supabase-js's `GenericSchema` requires (rows must satisfy
 * `Record<string, unknown>`). With interfaces the client's `Schema` generic
 * collapses to `never` and every typed query fails to compile.
 *
 * No `any` is used anywhere in this module — every field is explicitly typed.
 */

/**
 * `banks` — bank directory. No numeric id; `bank_code` is the natural key.
 */
export type BankRow = {
  bank_code: string;
  bank_name: string;
  /** e.g. "state_owned" / "private". */
  bank_type: string;
  source_url: string | null;
  is_active: boolean | null;
  created_at: string | null;
  /** Financial snapshot (ETB). Null until populated for a bank. */
  total_assets: number | null;
  total_deposite: number | null;
  total_branches: number | null;
  total_employee: number | null;
  loan_to_deposite_ratio: number | null;
  return_on_asset: number | null;
  return_on_equity: number | null;
  profit_before_tax: number | null;
  profit_after_tax: number | null;
  retained_earning: number | null;
  paid_up_capital: number | null;
  reserves: number | null;
  total_liabilities: number | null;
};

/**
 * `exchange_rates` — one row per (bank_code, currency_code, rate_date);
 * multiple rate dates per pair exist in the live data.
 */
export type ExchangeRateRow = {
  id: string;
  bank_code: string;
  currency_code: string;
  buying_rate: number | null;
  selling_rate: number | null;
  transactional_buying: number | null;
  transactional_selling: number | null;
  weighted_avg_buying: number | null;
  weighted_avg_selling: number | null;
  /** ISO date (YYYY-MM-DD). */
  rate_date: string;
  /** Observed value "SCRAPER"; free text in the database. */
  source: string | null;
  scraped_at: string | null;
};

/**
 * `manual_rates` — human overrides, keyed like exchange_rates.
 */
export type ManualRateRow = {
  id: string;
  bank_code: string;
  currency_code: string;
  /** Cash buying rate. */
  buying_rate: number | null;
  /** Cash selling rate. */
  selling_rate: number | null;
  /** Transactional buying rate; null when not published. */
  transactional_buying: number | null;
  /** Transactional selling rate; null when not published. */
  transactional_selling: number | null;
  /** ISO date (YYYY-MM-DD). */
  rate_date: string;
  /** FK → auth user id. */
  entered_by: string | null;
  note: string | null;
  created_at: string | null;
};

/**
 * `contact_messages` — submissions from the public Contact page. Append-only;
 * each row captures a validated visitor message.
 */
export type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string | null;
};

/**
 * `scrape_logs` — append-only run history. `run_id` groups one run across
 * banks; `bank_code` identifies the scraper target.
 */
export type ScrapeLogRow = {
  id: string;
  run_id: string;
  bank_code: string;
  /** Observed value "success"; free text in the database. */
  status: string;
  /** e.g. "updated" / "unchanged". */
  scenario: string;
  currencies_count: number | null;
  error_message: string | null;
  duration_ms: number | null;
  ran_at: string | null;
};

/**
 * `settings` — key/value admin configuration. `key` is the natural key; the
 * value is stored as text (booleans/numbers are serialized by the service
 * layer). Used to persist the admin profile and platform settings.
 */
export type SettingRow = {
  /** Setting natural key (e.g. "site_name", "admin_email"). */
  key: string;
  /** Stored value as text. */
  value: string;
  updated_at: string | null;
};

/**
 * `featured_content` — admin-controlled campaigns shown on the homepage hero.
 * The service layer decides which row is currently eligible (is_active +
 * schedule window); this table only stores data.
 */
export type FeaturedContentRow = {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  advertiser_name: string | null;
  /** Badge label rendered on the card (default "FEATURED"). */
  badge_text: string;
  /** CTA button label (default "Learn More"). */
  cta_text: string;
  destination_url: string;
  /** "internal" (client-side route) or "external" (http/https website). */
  destination_type: string;
  image_alt: string | null;
  is_active: boolean;
  display_order: number;
  /** Scheduled start; null = immediately eligible (when active). */
  start_at: string | null;
  /** Scheduled end; null = never expires. */
  end_at: string | null;
  /** FK → auth user id that created the campaign. */
  created_by: string | null;
  feature_1_icon: string | null;
  feature_1_title: string | null;
  feature_1_description: string | null;
  feature_2_icon: string | null;
  feature_2_title: string | null;
  feature_2_description: string | null;
  feature_3_icon: string | null;
  feature_3_title: string | null;
  feature_3_description: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * `featured_content_clicks` — append-only click analytics for featured
 * campaigns. Stores only the campaign id, the destination type, and a
 * timestamp; no personal information.
 */
export type FeaturedContentClickRow = {
  id: string;
  featured_content_id: string;
  /** "internal" or "external" (null when unknown). */
  destination_type: string | null;
  created_at: string;
};

/**
 * `users` — accounts backing JWT authentication. The configured admin is
 * provisioned from server config (`ADMIN_EMAIL` + `ADMIN_PASSWORD`) on
 * first login; `password_hash` is a scrypt-derived hash, never the
 * plaintext password. Roles: `admin`, `super_admin`, `customer`.
 */
export type UserRow = {
  id: string;
  /** Unique login identifier. */
  email: string;
  /** Display name (e.g. "Root Admin"). */
  name: string;
  /** Authorization role: "admin" | "super_admin" | "customer". */
  role: string;
  /** scrypt password hash (format `salt:hash` hex). */
  password_hash: string;
  avatar_url: string | null;
  created_at: string | null;
  /** Stamped on every successful login. */
  last_login_at: string | null;
};

/**
 * `api_plans` — available commercial API plans with pricing and quota limits.
 */
export type ApiPlanRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  /** Stored as numeric(10,2) — never use floating point for money. */
  price: number;
  /** ISO 4217 currency code (default "ETB"). */
  currency: string;
  /** Billing cycle (currently only "monthly"). */
  billing_interval: string;
  /** Max requests per billing period. */
  monthly_request_limit: number;
  /** Max requests per minute (rate limit). */
  requests_per_minute: number;
  /** Max API keys allowed for this plan. */
  max_api_keys: number;
  /** Whether this plan is available for purchase. */
  is_active: boolean;
  /** Sort order for display. */
  display_order: number;
  created_at: string;
  updated_at: string;
};

/**
 * `customers` — profile table extending `users` for commercial API customers.
 * One-to-one relationship via unique `user_id` FK.
 */
export type CustomerRow = {
  id: string;
  /** FK → users(id), unique (one profile per user). */
  user_id: string;
  company_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * `api_keys` — API access keys for programmatic access. The full secret is
 * only returned at creation time; the database stores only `key_prefix`
 * (public identifier) and `key_hash` (SHA-256 of the full secret).
 */
export type ApiKeyRow = {
  id: string;
  /** FK → customers(id). */
  customer_id: string;
  /** Human-readable label for this key. */
  name: string;
  /** Public identifier: the "eeh_live_" scheme plus the first secret characters. */
  key_prefix: string;
  /** SHA-256 hash of the full API key secret — never plaintext. */
  key_hash: string;
  /** Timestamp of last successful API call using this key. */
  last_used_at: string | null;
  /** Optional expiration date. Null = never expires. */
  expires_at: string | null;
  /** Timestamp when the key was revoked. Null = not revoked. */
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * `subscriptions` — customer subscriptions to API plans. Free plan
 * subscriptions are created with status `active` and price 0.
 * Paid plans start as `pending` until payment is approved.
 */
export type SubscriptionRow = {
  id: string;
  /** FK → customers(id). */
  customer_id: string;
  /** FK → api_plans(id). */
  plan_id: string;
  /** Status: "pending" | "active" | "expired" | "cancelled" | "suspended". */
  status: string;
  /** When the subscription becomes/was active. */
  starts_at: string | null;
  /** When the subscription ends/ended. */
  ends_at: string | null;
  /** Start of the current billing period. */
  current_period_start: string | null;
  /** End of the current billing period. */
  current_period_end: string | null;
  /** When the subscription was cancelled (if applicable). */
  cancelled_at: string | null;
  /** Reason for cancellation (if applicable). */
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * `payments` — manual bank-transfer payment records. Each payment is
 * generated with a unique `payment_reference` for tracking. Workflow:
 * pending → under_review → approved | rejected.
 */
export type PaymentRow = {
  id: string;
  /** FK → customers(id). */
  customer_id: string;
  /** FK → subscriptions(id). Null for one-time payments. */
  subscription_id: string | null;
  /** FK → api_plans(id). The plan this payment is for. */
  plan_id: string;
  /** Payment amount stored as numeric(10,2). */
  amount: number;
  /** ISO 4217 currency code (default "ETB"). */
  currency: string;
  /** System-generated unique payment reference. */
  payment_reference: string;
  /** Customer's bank transaction/reference number. */
  customer_transaction_ref: string | null;
  /** Payment method (currently only "bank_transfer"). */
  payment_method: string;
  /** Status: "pending" | "under_review" | "approved" | "rejected" | "cancelled". */
  status: string;
  /** When the customer submitted the payment. */
  submitted_at: string | null;
  /** When an admin reviewed the payment. */
  reviewed_at: string | null;
  /** FK → users(id). Admin who reviewed the payment. */
  reviewed_by: string | null;
  /** Reason if the payment was rejected. */
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * `payment_receipts` — file references for uploaded payment receipts/screenshots.
 * Actual files are stored in Supabase Storage; only the path is recorded here.
 */
export type PaymentReceiptRow = {
  id: string;
  /** FK → payments(id). */
  payment_id: string;
  /** Supabase Storage path to the receipt file. */
  storage_path: string;
  /** Original filename uploaded by the customer. */
  original_filename: string | null;
  /** MIME type of the uploaded file. */
  mime_type: string;
  uploaded_at: string;
};

/**
 * `api_usage` — aggregated request counts per API key per billing period.
 * One row per (api_key_id, period_start). The `request_count` is
 * incremented atomically by the backend — no per-request rows.
 */
export type ApiUsageRow = {
  id: string;
  /** FK → api_keys(id). */
  api_key_id: string;
  /** FK → subscriptions(id). Null for free-tier keys. */
  subscription_id: string | null;
  /** Start of the billing period (typically the 1st of the month). */
  period_start: string;
  /** Number of requests made using this key in this period. */
  request_count: number;
  created_at: string;
  updated_at: string;
};

/**
 * `bank_payment_config` — configurable bank account details for manual
 * transfers. Supports multiple bank accounts. Managed by admins.
 */
export type BankPaymentConfigRow = {
  id: string;
  /** Bank name (e.g. "Commercial Bank of Ethiopia"). */
  bank_name: string;
  /** Account holder name. */
  account_name: string;
  /** Bank account number. */
  account_number: string;
  /** Branch name (optional). */
  branch_name: string | null;
  /** Free-form payment instructions for customers. */
  instructions: string | null;
  /** Whether this bank account is currently shown to customers. */
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Minimal database schema map for the Supabase client generic.
 *
 * Rows returned by `supabase.from("banks").select()` are typed as
 * `Database["public"]["Tables"]["banks"]["Row"]`. Insert/Update are kept
 * permissive (`Partial<Row>`) on purpose — repositories stay permissive and
 * stricter mutation payloads become a service-layer concern in later phases.
 */
export type DatabaseTables = {
  banks: {
    Row: BankRow;
    Insert: Partial<BankRow>;
    Update: Partial<BankRow>;
    Relationships: [];
  };
  exchange_rates: {
    Row: ExchangeRateRow;
    Insert: Partial<ExchangeRateRow>;
    Update: Partial<ExchangeRateRow>;
    Relationships: [];
  };
  manual_rates: {
    Row: ManualRateRow;
    Insert: Partial<ManualRateRow>;
    Update: Partial<ManualRateRow>;
    Relationships: [];
  };
  contact_messages: {
    Row: ContactMessageRow;
    Insert: Partial<ContactMessageRow>;
    Update: Partial<ContactMessageRow>;
    Relationships: [];
  };
  scrape_logs: {
    Row: ScrapeLogRow;
    Insert: Partial<ScrapeLogRow>;
    Update: Partial<ScrapeLogRow>;
    Relationships: [];
  };
  featured_content: {
    Row: FeaturedContentRow;
    Insert: Partial<FeaturedContentRow>;
    Update: Partial<FeaturedContentRow>;
    Relationships: [];
  };
  featured_content_clicks: {
    Row: FeaturedContentClickRow;
    Insert: Partial<FeaturedContentClickRow>;
    Update: Partial<FeaturedContentClickRow>;
    Relationships: [];
  };
  settings: {
    Row: SettingRow;
    Insert: Partial<SettingRow>;
    Update: Partial<SettingRow>;
    Relationships: [];
  };
  users: {
    Row: UserRow;
    Insert: Partial<UserRow>;
    Update: Partial<UserRow>;
    Relationships: [];
  };
  api_plans: {
    Row: ApiPlanRow;
    Insert: Partial<ApiPlanRow>;
    Update: Partial<ApiPlanRow>;
    Relationships: [];
  };
  customers: {
    Row: CustomerRow;
    Insert: Partial<CustomerRow>;
    Update: Partial<CustomerRow>;
    Relationships: [];
  };
  api_keys: {
    Row: ApiKeyRow;
    Insert: Partial<ApiKeyRow>;
    Update: Partial<ApiKeyRow>;
    Relationships: [];
  };
  subscriptions: {
    Row: SubscriptionRow;
    Insert: Partial<SubscriptionRow>;
    Update: Partial<SubscriptionRow>;
    Relationships: [];
  };
  payments: {
    Row: PaymentRow;
    Insert: Partial<PaymentRow>;
    Update: Partial<PaymentRow>;
    Relationships: [];
  };
  payment_receipts: {
    Row: PaymentReceiptRow;
    Insert: Partial<PaymentReceiptRow>;
    Update: Partial<PaymentReceiptRow>;
    Relationships: [];
  };
  api_usage: {
    Row: ApiUsageRow;
    Insert: Partial<ApiUsageRow>;
    Update: Partial<ApiUsageRow>;
    Relationships: [];
  };
  bank_payment_config: {
    Row: BankPaymentConfigRow;
    Insert: Partial<BankPaymentConfigRow>;
    Update: Partial<BankPaymentConfigRow>;
    Relationships: [];
  };
};

export type Database = {
  public: {
    Tables: DatabaseTables;
    /** No views or functions are used — required by supabase-js's GenericSchema. */
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
