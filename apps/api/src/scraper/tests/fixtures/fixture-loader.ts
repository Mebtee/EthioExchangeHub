import * as fs from 'fs';
import * as path from 'path';

export interface RateExpectation {
  currencyTo: string;
  buyRateMin: number;
  buyRateMax: number;
  sellRateMin: number;
  sellRateMax: number;
}

export interface FixtureDefinition {
  name: string;
  file: string;
  description: string;
  expectedCount: number;
  expectedRates: RateExpectation[];
}

const FIXTURES_DIR = __dirname;

function loadFixture(filename: string): string {
  const fixturePath = path.join(FIXTURES_DIR, filename);
  return fs.readFileSync(fixturePath, 'utf-8');
}

export function loadFixtureHtml(filename: string): string {
  try {
    return loadFixture(filename);
  } catch {
    // Fallback for when running from different working directory
    const altPath = path.join(process.cwd(), 'src', 'scraper', 'tests', 'fixtures', filename);
    return fs.readFileSync(altPath, 'utf-8');
  }
}

// ── Fixture Definitions ────────────────────────────────────────
// Each fixture represents a real-world Ethiopian bank page structure.
// expectedRates defines the range for each expected currency rate.

export const FIXTURES: Record<string, FixtureDefinition> = {
  'cbe': {
    name: 'CBE (Commercial Bank of Ethiopia)',
    file: 'cbe-exchange-rates.html',
    description: 'Standard table with Currency | Buying | Selling columns. Full currency names with row header.',
    expectedCount: 5,
    expectedRates: [
      { currencyTo: 'USD', buyRateMin: 57.0, buyRateMax: 58.0, sellRateMin: 58.0, sellRateMax: 59.5 },
      { currencyTo: 'EUR', buyRateMin: 61.5, buyRateMax: 63.0, sellRateMin: 63.0, sellRateMax: 64.5 },
      { currencyTo: 'GBP', buyRateMin: 71.5, buyRateMax: 73.5, sellRateMin: 73.0, sellRateMax: 75.0 },
      { currencyTo: 'SAR', buyRateMin: 14.5, buyRateMax: 16.0, sellRateMin: 15.0, sellRateMax: 16.5 },
      { currencyTo: 'AED', buyRateMin: 14.5, buyRateMax: 16.5, sellRateMin: 15.0, sellRateMax: 17.0 },
    ],
  },
  'awash': {
    name: 'Awash International Bank',
    file: 'awash-exchange-rates.html',
    description: 'Table with Currency Name | Buying | Selling | Date. Uses ISO codes instead of full names.',
    expectedCount: 5,
    expectedRates: [
      { currencyTo: 'USD', buyRateMin: 56.5, buyRateMax: 58.0, sellRateMin: 58.0, sellRateMax: 59.5 },
      { currencyTo: 'EUR', buyRateMin: 61.0, buyRateMax: 63.0, sellRateMin: 62.5, sellRateMax: 64.5 },
      { currencyTo: 'GBP', buyRateMin: 71.5, buyRateMax: 73.5, sellRateMin: 73.0, sellRateMax: 75.0 },
    ],
  },
  'dashen': {
    name: 'Dashen Bank',
    file: 'dashen-exchange-rates.html',
    description: 'Table with Currency | Buy | Sell (no thead). Mixed full names and uppercase ISO codes.',
    expectedCount: 5,
    expectedRates: [
      { currencyTo: 'USD', buyRateMin: 57.0, buyRateMax: 58.5, sellRateMin: 58.0, sellRateMax: 59.5 },
      { currencyTo: 'EUR', buyRateMin: 61.5, buyRateMax: 63.0, sellRateMin: 63.0, sellRateMax: 64.5 },
      { currencyTo: 'GBP', buyRateMin: 72.0, buyRateMax: 73.5, sellRateMin: 73.5, sellRateMax: 75.0 },
    ],
  },
  'nib': {
    name: 'Nib International Bank',
    file: 'nib-exchange-rates.html',
    description: 'Clean table with Currency | Buying | Selling. ISO codes, no extra columns.',
    expectedCount: 5,
    expectedRates: [
      { currencyTo: 'USD', buyRateMin: 56.5, buyRateMax: 58.0, sellRateMin: 58.0, sellRateMax: 59.5 },
      { currencyTo: 'EUR', buyRateMin: 61.5, buyRateMax: 63.0, sellRateMin: 63.0, sellRateMax: 64.5 },
    ],
  },
  'generic': {
    name: 'Generic Bank (all 8 currencies)',
    file: 'generic-table.html',
    description: 'Full 8-currency table with parenthetical ISO codes in the currency column.',
    expectedCount: 8,
    expectedRates: [
      { currencyTo: 'USD', buyRateMin: 57.0, buyRateMax: 58.0, sellRateMin: 58.0, sellRateMax: 59.5 },
      { currencyTo: 'EUR', buyRateMin: 61.5, buyRateMax: 63.0, sellRateMin: 63.0, sellRateMax: 64.5 },
      { currencyTo: 'GBP', buyRateMin: 71.5, buyRateMax: 73.5, sellRateMin: 73.0, sellRateMax: 75.0 },
      { currencyTo: 'SAR', buyRateMin: 14.5, buyRateMax: 16.0, sellRateMin: 15.0, sellRateMax: 16.5 },
      { currencyTo: 'AED', buyRateMin: 14.5, buyRateMax: 16.5, sellRateMin: 15.0, sellRateMax: 17.0 },
      { currencyTo: 'CNY', buyRateMin: 7.0, buyRateMax: 9.0, sellRateMin: 7.5, sellRateMax: 9.0 },
      { currencyTo: 'JPY', buyRateMin: 0.2, buyRateMax: 0.6, sellRateMin: 0.3, sellRateMax: 0.6 },
      { currencyTo: 'CHF', buyRateMin: 62.0, buyRateMax: 64.0, sellRateMin: 63.5, sellRateMax: 65.5 },
    ],
  },
  'amhara': {
    name: 'Amhara Bank',
    file: 'amhara-exchange-rates.html',
    description: 'Table with No | Currency | Buying | Selling. Has an extra numbered column before currency.',
    expectedCount: 5,
    expectedRates: [
      { currencyTo: 'USD', buyRateMin: 57.0, buyRateMax: 58.5, sellRateMin: 58.0, sellRateMax: 59.5 },
    ],
  },
  'boa': {
    name: 'Bank of Abyssinia',
    file: 'bank-of-abyssinia-rates.html',
    description: 'Table with Currency | Buying | Selling | Last Update. ISO codes with date column.',
    expectedCount: 5,
    expectedRates: [
      { currencyTo: 'USD', buyRateMin: 56.5, buyRateMax: 58.0, sellRateMin: 58.0, sellRateMax: 59.5 },
    ],
  },
  'coop': {
    name: 'Cooperative Bank of Oromia',
    file: 'coop-exchange-rates.html',
    description: 'Clean table with Currency | Buy | Sell. ISO codes.',
    expectedCount: 5,
    expectedRates: [
      { currencyTo: 'USD', buyRateMin: 57.0, buyRateMax: 58.0, sellRateMin: 58.0, sellRateMax: 59.5 },
    ],
  },
  'div': {
    name: 'Div-based layout (no table)',
    file: 'div-based-rates.html',
    description: 'No table elements. Rates in div.rate-item with span.currency-name, .buy-rate, .sell-rate.',
    expectedCount: 4,
    expectedRates: [
      { currencyTo: 'USD', buyRateMin: 57.0, buyRateMax: 58.0, sellRateMin: 58.0, sellRateMax: 59.5 },
    ],
  },
  'berhan': {
    name: 'Berhan Bank',
    file: 'berhan-exchange-rates.html',
    description: 'Standard table with Currency | Buying | Selling. Full currency names.',
    expectedCount: 5,
    expectedRates: [
      { currencyTo: 'USD', buyRateMin: 57.0, buyRateMax: 58.5, sellRateMin: 58.0, sellRateMax: 59.5 },
    ],
  },
  'gohbet': {
    name: 'Goh Betoch Bank',
    file: 'gohbet-exchange-rates.html',
    description: 'Uppercase BUYING/SELLING headers. ISO codes.',
    expectedCount: 5,
    expectedRates: [
      { currencyTo: 'USD', buyRateMin: 57.0, buyRateMax: 58.5, sellRateMin: 58.0, sellRateMax: 59.5 },
    ],
  },
  'bunna': {
    name: 'Bunna International Bank',
    file: 'bunna-exchange-rates.html',
    description: 'Standard table with Currency | Buying | Selling wrapped in div.table-wrap.',
    expectedCount: 5,
    expectedRates: [
      { currencyTo: 'USD', buyRateMin: 56.5, buyRateMax: 58.0, sellRateMin: 58.0, sellRateMax: 59.5 },
    ],
  },
  'zamzam': {
    name: 'ZamZam Bank',
    file: 'zamzam-exchange-rates.html',
    description: 'Minimal table with Currency | Buy | Sell. 3 currencies.',
    expectedCount: 3,
    expectedRates: [
      { currencyTo: 'USD', buyRateMin: 57.0, buyRateMax: 58.0, sellRateMin: 58.0, sellRateMax: 59.5 },
    ],
  },
  'empty': {
    name: 'Empty table (no data rows)',
    file: 'empty-table.html',
    description: 'Table with headers but no tbody rows. Edge case for empty data.',
    expectedCount: 0,
    expectedRates: [],
  },
  'malformed': {
    name: 'Malformed data',
    file: 'malformed-data.html',
    description: 'Table with N/A, empty cells, invalid currency codes, and one valid rate.',
    expectedCount: 1,
    expectedRates: [
      { currencyTo: 'SAR', buyRateMin: 14.5, buyRateMax: 16.0, sellRateMin: 15.0, sellRateMax: 16.5 },
    ],
  },
};
