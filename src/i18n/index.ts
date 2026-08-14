import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import { LOCALES, normalizeLocale, type Locale } from "./locale";
import en from "../../messages/en.json";
import am from "../../messages/am.json";
import zh from "../../messages/zh.json";

export const resources = {
  en: { translation: en },
  am: { translation: am },
  zh: { translation: zh },
} as const;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: LOCALES,
    load: "languageOnly",
    nonExplicitSupportedLngs: true,
    ns: ["translation"],
    defaultNS: "translation",
    interpolation: {
      escapeValue: false,
    },
    // Make init synchronous so tests can rely on translations immediately.
    initAsync: false,
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: "ethio-exchange-lng",
      caches: ["localStorage"],
    },
  });

/** Detect the visitor's preferred locale for the bare `/` entry point. */
export function getInitialLocale(): Locale {
  const stored = localStorage.getItem("ethio-exchange-lng");
  return normalizeLocale(stored ?? navigator.language);
}

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof en };
  }
}

export default i18n;
