export const LOCALES = ["en", "am", "zh"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: string | undefined | null): value is Locale {
  return value != null && (LOCALES as readonly string[]).includes(value);
}

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  am: "አማርኛ",
  zh: "中文",
};

/** Map a raw browser language (e.g. "en-US", "am", "zh-CN") to a supported locale. */
export function normalizeLocale(language: string | undefined): Locale {
  const base = language?.split("-")[0]?.toLowerCase();
  return isLocale(base) ? base : DEFAULT_LOCALE;
}
