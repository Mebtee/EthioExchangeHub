import * as cheerio from 'cheerio';
import type { ScraperMetadata, RawScrapedRate } from '../interfaces/bank-scraper.interface';
import type { Currency } from '@prisma/client';
import { BaseScraper } from './base.scraper';
import { HttpClientService } from '../utils/http-client';
import { Injectable } from '@nestjs/common';

function createCurrencyMapper() {
  const map: Record<string, Currency> = {
    USD: 'USD', 'US DOLLAR': 'USD', DOLLAR: 'USD', EUR: 'EUR', EURO: 'EUR',
    GBP: 'GBP', 'POUND STERLING': 'GBP', POUND: 'GBP',
    SAR: 'SAR', 'SAUDI RIYAL': 'SAR', RIYAL: 'SAR',
    AED: 'AED', 'UAE DIRHAM': 'AED', DIRHAM: 'AED',
    CNY: 'CNY', 'CHINESE YUAN': 'CNY', YUAN: 'CNY', RMB: 'CNY',
    JPY: 'JPY', 'JAPANESE YEN': 'JPY', YEN: 'JPY',
    CHF: 'CHF', 'SWISS FRANC': 'CHF', FRANC: 'CHF',
  };
  return (text: string): Currency | null => {
    const upper = text.toUpperCase();
    if (map[upper]) return map[upper]!;
    for (const [key, value] of Object.entries(map)) { if (upper.includes(key)) return value; }
    const match = upper.match(/\b([A-Z]{3})\b/);
    if (match && map[match[1]!]) return map[match[1]!]!;
    return null;
  };
}

function parseNumeric(text: string): number {
  return parseFloat(text.replace(/[^0-9.,]/g, '').replace(/,/g, '')) || 0;
}

function parseTable(html: string): RawScrapedRate[] {
  const $ = cheerio.load(html);
  const rates: RawScrapedRate[] = [];
  const mapCurrency = createCurrencyMapper();
  const tables = $('table').filter((_, el) => {
    const text = $(el).text().toLowerCase();
    return text.includes('buy') || text.includes('sell') || text.includes('exchange') || text.includes('currency');
  });
  for (const table of tables) {
    const rows = $(table).find('tr');
    for (let i = 1; i < rows.length; i++) {
      const cells = $(rows[i]).find('td');
      if (cells.length < 3) continue;
      const currencyText = $(cells[0]).text().trim().toUpperCase();
      const buyRate = parseNumeric($(cells[1]).text());
      const sellRate = parseNumeric($(cells[2]).text());
      const currencyCode = mapCurrency(currencyText);
      if (currencyCode && buyRate > 0 && sellRate > 0) {
        rates.push({ currencyFrom: 'ETB', currencyTo: currencyCode, buyRate, sellRate, rawText: currencyText });
      }
    }
  }
  return rates;
}

function createScraperClass(slug: string, name: string, website: string, method: 'cheerio' | 'playwright' = 'cheerio') {
  @Injectable()
  class DynamicScraper extends BaseScraper {
    readonly metadata: ScraperMetadata = {
      slug, name, website, method, isActive: true,
      supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
    };
    constructor(private readonly httpClient: HttpClientService) { super(); }
    async scrapeRates(): Promise<RawScrapedRate[]> {
      const { html } = await this.httpClient.fetch({ url: this.metadata.website, timeout: 30_000 });
      return parseTable(html);
    }
  }
  return DynamicScraper;
}

export const AbayScraper = createScraperClass('AB', 'Abay Bank', 'https://www.abaybanksc.com/');
export const AddisScraper = createScraperClass('ADDIS', 'Addis International Bank', 'https://addisbanksc.com/');
export const AhaduScraper = createScraperClass('AHADU', 'Ahadu Bank', 'https://ahadubank.com/');
export const DbeScraper = createScraperClass('DBE', 'Development Bank of Ethiopia', 'https://dbe.com.et/');
export const GadaaScraper = createScraperClass('GADA', 'Gadaa Bank', 'https://www.gadaabank.com.et/');
export const GlobalScraper = createScraperClass('GB', 'Global Bank Ethiopia', 'https://www.globalbankethiopia.com/');
export const HibretScraper = createScraperClass('HIBRET', 'Hibret Bank', 'https://hibretbank.com.et/');
export const HijraScraper = createScraperClass('HIJRA', 'Hijra Bank', 'https://hijra-bank.com/');
export const LionScraper = createScraperClass('LIB', 'Lion International Bank', 'https://anbesabank.com/');
export const OmoScraper = createScraperClass('OMO', 'Omo Bank', 'https://omobanksc.com/');
export const OibScraper = createScraperClass('OIB', 'Oromia International Bank', 'https://oromiabank.com/exchange-rates/');
export const RammisScraper = createScraperClass('RAMMIS', 'Rammis Bank', 'https://rammisbank.et/currency-exchange');
export const ShemScraper = createScraperClass('SM', 'Shem Bank', 'https://shembank.com/exchange-rate/');
export const SidamaScraper = createScraperClass('SIDAMA', 'Sidama Bank', 'https://sidamabanksc.com/exchange-rate/');
export const SiinqeeScraper = createScraperClass('SIINQEE', 'Siinqee Bank', 'https://siinqeebank.com/');
export const SiketScraper = createScraperClass('SIKET', 'Siket Bank', 'https://siketbank.com/exchange-rate/');
export const TsedayScraper = createScraperClass('TSB', 'Tsedey Bank', 'https://www.tsedeybank.com.et/');
export const WegagenScraper = createScraperClass('WB', 'Wegagen Bank', 'https://www.wegagen.com/');
export const ZamZamScraper = createScraperClass('ZAMZAM', 'ZamZam Bank', 'https://zamzambank.com/exchange-rates/');
