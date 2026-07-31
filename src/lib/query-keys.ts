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
