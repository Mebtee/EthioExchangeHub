'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { translations, type Locale, type TranslationKey } from './translations';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey | string, params?: Record<string, string | number>) => string;
  isRtl: boolean;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('ethiobankshub-locale') as Locale) ?? 'en';
    }
    return 'en';
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    document.documentElement.dir = newLocale === 'am' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLocale;
    localStorage.setItem('ethiobankshub-locale', newLocale);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = translations[locale] ?? translations['en'];
      let text = dict[key] ?? key;

      if (text === key) {
        // Try the translations dict with als. prefix for backward compat
        text = dict[`als.${key}`] ?? key;
      }

      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(`{{${k}}}`, String(v));
        });
      }

      return text;
    },
    [locale],
  );

  return (
    <LocaleContext.Provider
      value={{
        locale,
        setLocale,
        t,
        isRtl: locale === 'am',
      }}
    >
      <div className={locale === 'am' ? 'font-noto-ethiopic' : ''}>{children}</div>
    </LocaleContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LocaleProvider');
  }
  return context;
}
