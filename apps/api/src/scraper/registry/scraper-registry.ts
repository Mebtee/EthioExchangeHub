import type { ScraperMetadata, ScrapeMethod } from '../interfaces/bank-scraper.interface';
import type { Currency } from '@prisma/client';

// ── Supported Currencies ───────────────────────────────────────
export const SUPPORTED_CURRENCIES: Currency[] = [
  'USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF',
];

// ── Registry Entry ─────────────────────────────────────────────
export interface RegistryEntry {
  slug: string;
  metadata: ScraperMetadata;
  ScraperClass: new (...args: never[]) => unknown;
}

const registry = new Map<string, RegistryEntry>();

// ── Registration Helpers ───────────────────────────────────────
export function registerScraper(entry: RegistryEntry): void {
  registry.set(entry.slug, entry);
}

export function getScraperEntry(slug: string): RegistryEntry | undefined {
  return registry.get(slug);
}

export function getAllScraperEntries(): RegistryEntry[] {
  return Array.from(registry.values());
}

export function getActiveScraperEntries(): RegistryEntry[] {
  return getAllScraperEntries().filter((e) => e.metadata.isActive);
}

export function getScraperCount(): number {
  return registry.size;
}

// ── Bank Metadata Definitions ──────────────────────────────────
// All 31 Ethiopian commercial banks with official exchange-rate pages.
// method: 'detect' = auto-detect cheerio/playwright/ajax/pdf/api
//
// Detection rules:
//   - cheerio: static HTML tables, no JS rendering needed
//   - playwright: JS-rendered pages, AJAX-loaded tables
//   - pdf: exchange rates published as PDF
//   - api: returns structured JSON/XML data directly

export const BANK_METADATA: Omit<ScraperMetadata, 'isActive'>[] = [
  // ── Dedicated Scrapers (custom parsing implementations) ──────
  {
    slug: 'CBE',
    name: 'Commercial Bank of Ethiopia',
    website: 'https://combanketh.et/exchange-rates?srcPage=home',
    method: 'cheerio',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'AWIN',
    name: 'Awash International Bank',
    website: 'https://awashbank.com/exchange-historical/',
    method: 'cheerio',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'DASH',
    name: 'Dashen Bank',
    website: 'https://dashenbanksc.com/daily-exchange-rates/',
    method: 'cheerio',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'ZEMEN',
    name: 'Zemen Bank',
    website: 'https://zemenbank.com/exchange-rates',
    method: 'playwright',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },

  // ── Dedicated HTML Scrapers ─────────────────────────────────
  {
    slug: 'BOA',
    name: 'Bank of Abyssinia',
    website: 'https://www.bankofabyssinia.com/exchange-rate-2/',
    method: 'cheerio',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'AB',
    name: 'Abay Bank',
    website: 'https://www.abaybanksc.com/',
    method: 'detect',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'ADDIS',
    name: 'Addis International Bank',
    website: 'https://addisbanksc.com/',
    method: 'detect',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'AHADU',
    name: 'Ahadu Bank',
    website: 'https://ahadubank.com/',
    method: 'detect',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'AMHARA',
    name: 'Amhara Bank',
    website: 'https://www.amharabank.com.et/daily-exchange-rate/',
    method: 'cheerio',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'BIB',
    name: 'Berhan Bank',
    website: 'https://berhanbanksc.com/exchange-rates/',
    method: 'cheerio',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'BUNNA',
    name: 'Bunna International Bank',
    website: 'https://bunnabanksc.com/foreign-exchange/',
    method: 'cheerio',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'COOP',
    name: 'Cooperative Bank of Oromia',
    website: 'https://coopbankoromia.com.et/daily-exchange-rates/',
    method: 'cheerio',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'DBE',
    name: 'Development Bank of Ethiopia',
    website: 'https://dbe.com.et/',
    method: 'detect',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'ENAT',
    name: 'Enat Bank',
    website: 'https://www.enatbanksc.com/#exchange',
    method: 'playwright',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'GADA',
    name: 'Gadaa Bank',
    website: 'https://www.gadaabank.com.et/',
    method: 'detect',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'GB',
    name: 'Global Bank Ethiopia',
    website: 'https://www.globalbankethiopia.com/',
    method: 'detect',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'GOHBET',
    name: 'Goh Betoch Bank',
    website: 'https://www.gohbetbank.com/todays-exchange-rate/',
    method: 'cheerio',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'HIBRET',
    name: 'Hibret Bank',
    website: 'https://hibretbank.com.et/',
    method: 'detect',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'HIJRA',
    name: 'Hijra Bank',
    website: 'https://hijra-bank.com/',
    method: 'detect',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'LIB',
    name: 'Lion International Bank (Anbesa Bank)',
    website: 'https://anbesabank.com/',
    method: 'detect',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'NIB',
    name: 'Nib International Bank',
    website: 'https://www.nibbank.com/exchange-rate/',
    method: 'cheerio',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'OMO',
    name: 'Omo Bank',
    website: 'https://omobanksc.com/',
    method: 'detect',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'OIB',
    name: 'Oromia International Bank',
    website: 'https://oromiabank.com/exchange-rates/',
    method: 'cheerio',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'RAMMIS',
    name: 'Rammis Bank',
    website: 'https://rammisbank.et/currency-exchange',
    method: 'cheerio',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'SM',
    name: 'Shem Bank',
    website: 'https://shembank.com/exchange-rate/',
    method: 'cheerio',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'SIDAMA',
    name: 'Sidama Bank',
    website: 'https://sidamabanksc.com/exchange-rate/',
    method: 'cheerio',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'SIINQEE',
    name: 'Siinqee Bank',
    website: 'https://siinqeebank.com/',
    method: 'detect',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'SIKET',
    name: 'Siket Bank',
    website: 'https://siketbank.com/exchange-rate',
    method: 'cheerio',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'TSB',
    name: 'Tsedey Bank',
    website: 'https://www.tsedeybank.com.et/',
    method: 'detect',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'WB',
    name: 'Wegagen Bank',
    website: 'https://www.wegagen.com/',
    method: 'detect',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
  {
    slug: 'ZAMZAM',
    name: 'ZamZam Bank',
    website: 'https://zamzambank.com/exchange-rates/',
    method: 'cheerio',
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  },
] as const;

// Add NBE as a special reference scraper
export const NBE_METADATA: ScraperMetadata = {
  slug: 'NBE',
  name: 'National Bank of Ethiopia',
  website: 'https://nbe.gov.et/exchange-rates',
  method: 'cheerio',
  isActive: true,
  supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
};

// ── Configurable Currency List ─────────────────────────────────
export function getConfigurableCurrencies(): Currency[] {
  return SUPPORTED_CURRENCIES;
}
