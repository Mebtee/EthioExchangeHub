import type { ScraperMetadata } from '../interfaces/bank-scraper.interface';
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
// These are the website URLs where each bank publishes rates.
// When method is 'detect', the scraper will auto-detect the best method.

export const BANK_METADATA: Omit<ScraperMetadata, 'isActive'>[] = [
  { slug: 'CBE', name: 'Commercial Bank of Ethiopia', website: 'https://combanketh.et/exchange-rates', method: 'cheerio', supportedCurrencies: ['USD', 'EUR', 'GBP'] },
  { slug: 'AWIN', name: 'Awash International Bank', website: 'https://awashbank.com/exchange-rate', method: 'cheerio', supportedCurrencies: ['USD', 'EUR', 'GBP'] },
  { slug: 'DASH', name: 'Dashen Bank', website: 'https://dashenbanksc.com/exchange-rate', method: 'cheerio', supportedCurrencies: ['USD', 'EUR', 'GBP'] },
  { slug: 'BOA', name: 'Bank of Abyssinia', website: 'https://bankofabyssinia.com/exchange-rate', method: 'cheerio', supportedCurrencies: ['USD', 'EUR', 'GBP'] },
  { slug: 'WB', name: 'Wegagen Bank', website: 'https://wegagenbank.com/exchange-rate', method: 'cheerio', supportedCurrencies: ['USD', 'EUR', 'GBP'] },
  { slug: 'UB', name: 'United Bank', website: 'https://unitedbank.com.et/exchange-rate', method: 'cheerio', supportedCurrencies: ['USD', 'EUR', 'GBP'] },
  { slug: 'NIB', name: 'Nib International Bank', website: 'https://nibbank.com/exchange-rate', method: 'cheerio', supportedCurrencies: ['USD', 'EUR', 'GBP'] },
  { slug: 'BIB', name: 'Berhan International Bank', website: 'https://berhanbank.com/exchange-rate', method: 'cheerio', supportedCurrencies: ['USD', 'EUR', 'GBP'] },
  { slug: 'LIB', name: 'Lion International Bank', website: 'https://lionbanket.com/exchange-rate', method: 'cheerio', supportedCurrencies: ['USD', 'EUR', 'GBP'] },
  { slug: 'ZEMEN', name: 'Zemen Bank', website: 'https://zemenbank.com/exchange-rate', method: 'playwright', supportedCurrencies: ['USD', 'EUR', 'GBP'] },
  { slug: 'AB', name: 'Abay Bank', website: 'https://abaybank.com.et/exchange-rate', method: 'cheerio', supportedCurrencies: ['USD', 'EUR', 'GBP'] },
  { slug: 'BUNNA', name: 'Bunna International Bank', website: 'https://bunnabanksc.com/exchange-rate', method: 'cheerio', supportedCurrencies: ['USD', 'EUR', 'GBP'] },
  { slug: 'DB', name: 'Debub Global Bank', website: 'https://debubglobalbank.com/exchange-rate', method: 'cheerio', supportedCurrencies: ['USD', 'EUR', 'GBP'] },
  { slug: 'ENAT', name: 'Enat Bank', website: 'https://enatbank.com/exchange-rate', method: 'cheerio', supportedCurrencies: ['USD', 'EUR', 'GBP'] },
  { slug: 'COOP', name: 'Cooperative Bank of Oromia', website: 'https://coopbankoromia.com.et/exchange-rate', method: 'cheerio', supportedCurrencies: ['USD', 'EUR', 'GBP'] },
  { slug: 'SM', name: 'Shem Bank', website: 'https://shembank.com/exchange-rate', method: 'cheerio', supportedCurrencies: ['USD', 'EUR', 'GBP'] },
  { slug: 'HIB', name: 'Hijira Bank', website: 'https://hijirabank.com/exchange-rate', method: 'cheerio', supportedCurrencies: ['USD', 'EUR', 'GBP'] },
  { slug: 'TSB', name: 'Tseday Bank', website: 'https://tsedaybank.com/exchange-rate', method: 'cheerio', supportedCurrencies: ['USD', 'EUR', 'GBP'] },
  { slug: 'AMHARA', name: 'Amhara Bank', website: 'https://amharabank.com.et/exchange-rate', method: 'cheerio', supportedCurrencies: ['USD', 'EUR', 'GBP'] },
  { slug: 'GADA', name: 'Gada Bank', website: 'https://gadabank.com/exchange-rate', method: 'cheerio', supportedCurrencies: ['USD', 'EUR', 'GBP'] },
  { slug: 'OMO', name: 'Omo Bank', website: 'https://omobank.com.et/exchange-rate', method: 'cheerio', supportedCurrencies: ['USD', 'EUR', 'GBP'] },
];

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
