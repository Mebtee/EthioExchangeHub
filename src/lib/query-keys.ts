/** Centralized TanStack Query key factories. */
export const exchangeRateKeys = {
  all: ["exchange-rates"] as const,
  list: (currency?: string) => ["exchange-rates", { currency }] as const,
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

export const marketTickerKeys = {
  all: ["market-ticker"] as const,
  lists: () => [...marketTickerKeys.all, "list"] as const,
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
};
