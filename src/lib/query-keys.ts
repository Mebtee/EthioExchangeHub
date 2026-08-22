/** Centralized TanStack Query key factories. */
export const exchangeRateKeys = {
  all: ["exchange-rates"] as const,
  list: (currency?: string, asOf?: string) => ["exchange-rates", { currency, asOf }] as const,
  dateRange: () => [...exchangeRateKeys.all, "date-range"] as const,
};

export const bankKeys = {
  all: ["banks"] as const,
  lists: () => [...bankKeys.all, "list"] as const,
  detail: (slug?: string) => [...bankKeys.all, "detail", slug] as const,
};

export const currencyKeys = {
  all: ["currencies"] as const,
  lists: () => [...currencyKeys.all, "list"] as const,
};

export const newsKeys = {
  all: ["news"] as const,
  lists: () => [...newsKeys.all, "list"] as const,
  categories: () => [...newsKeys.all, "categories"] as const,
};

export const featuredKeys = {
  all: ["featured"] as const,
  /** The homepage's single eligible campaign (null when none). */
  active: () => [...featuredKeys.all, "active"] as const,
  /** Admin: every campaign with aggregate click counts. */
  adminList: () => [...featuredKeys.all, "admin", "list"] as const,
};

export const adminKeys = {
  all: ["admin"] as const,
  dashboard: () => [...adminKeys.all, "dashboard"] as const,
  rateTrend: () => [...adminKeys.all, "rate-trend"] as const,
  manualRates: () => [...adminKeys.all, "manual-rates"] as const,
  scrapeLogs: (limit?: number) =>
    limit === undefined
      ? ([...adminKeys.all, "scrape-logs"] as const)
      : ([...adminKeys.all, "scrape-logs", limit] as const),
  scraperHealth: () => [...adminKeys.all, "scraper-health"] as const,
  scraperHealthList: () => [...adminKeys.all, "scraper-health-list"] as const,
  profile: () => [...adminKeys.all, "profile"] as const,
  settings: () => [...adminKeys.all, "settings"] as const,
  payments: (status?: string) =>
    status === undefined
      ? ([...adminKeys.all, "payments"] as const)
      : ([...adminKeys.all, "payments", { status }] as const),
  bankAccounts: () => [...adminKeys.all, "bank-accounts"] as const,
};

/** Customer developer-portal queries (Phase 6). */
export const customerKeys = {
  all: ["customer"] as const,
  plans: () => [...customerKeys.all, "plans"] as const,
  subscription: () => [...customerKeys.all, "subscription"] as const,
  apiKeys: () => [...customerKeys.all, "api-keys"] as const,
  payments: () => [...customerKeys.all, "payments"] as const,
  paymentMethods: () => [...customerKeys.all, "payment-methods"] as const,
  usage: () => [...customerKeys.all, "usage"] as const,
  keyUsage: (keyId: string) => [...customerKeys.all, "usage", keyId] as const,
};
