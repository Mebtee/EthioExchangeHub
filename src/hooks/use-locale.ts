import { useCallback } from "react";
import { useParams } from "react-router-dom";

import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/locale";

export function localizePath(path: string, locale: Locale): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (clean === "/") return `/${locale}`;
  return `/${locale}${clean}`;
}

/**
 * Resolves the active locale from the `:locale` route segment (falling back to
 * the default when rendered outside a locale route, e.g. in tests) and builds
 * locale-prefixed paths for internal links.
 */
export function useLocale(): { locale: Locale; localize: (path: string) => string } {
  const { locale: raw } = useParams<{ locale?: string }>();
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  const localize = useCallback((path: string) => localizePath(path, locale), [locale]);

  return { locale, localize };
}
