import { Injectable, Logger } from '@nestjs/common';
import type { ScraperMetadata, RawScrapedRate } from '../interfaces/bank-scraper.interface';
import type { Currency } from '@prisma/client';
import { BaseScraper } from './base.scraper';
import * as cheerio from 'cheerio';

@Injectable()
export class ZemenScraper extends BaseScraper {
  readonly metadata: ScraperMetadata = {
    slug: 'ZEMEN',
    name: 'Zemen Bank',
    website: 'https://zemenbank.com/exchange-rates',
    method: 'playwright',
    isActive: true,
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  };

  private readonly logger = new Logger(ZemenScraper.name);

  constructor() {
    super();
  }

  /**
   * Fetches Zemen's exchange rate page via Playwright and parses the table.
   */
  async scrapeRates(): Promise<RawScrapedRate[]> {
    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });

      try {
        const context = await browser.newContext({
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        });

        const page = await context.newPage();
        await page.goto(this.metadata.website, { waitUntil: 'networkidle', timeout: 30_000 });
        // Wait for potential table to load
        await page.waitForSelector('table, .rate-item, [class*="rate"]', { timeout: 10_000 }).catch(() => {});
        const html = await page.content();
        await page.close();
        await context.close();

        return this.parseZemenRates(html);
      } finally {
        await browser.close();
      }
    } catch (error) {
      this.logger.error(`Zemen Playwright scrape failed: ${error instanceof Error ? error.message : 'Unknown'}`);
      throw error;
    }
  }

  /**
   * Parse Zemen's exchange rate table from rendered HTML.
   */
  parseZemenRates(html: string): RawScrapedRate[] {
    const $ = cheerio.load(html);
    const rates: RawScrapedRate[] = [];

    const tables = $('table').filter((_, el) => {
      const text = $(el).text().toLowerCase();
      return text.includes('currency') || text.includes('buying') || text.includes('selling');
    });

    for (const table of tables) {
      const rows = $(table).find('tr');
      for (let i = 1; i < rows.length; i++) {
        const cells = $(rows[i]).find('td');
        if (cells.length < 3) continue;

        const currencyText = $(cells[0]).text().trim().toUpperCase();
        const buyRate = this.parseNumeric($(cells[1]).text());
        const sellRate = this.parseNumeric($(cells[2]).text());

        const currencyCode = this.mapCurrency(currencyText);
        if (currencyCode && buyRate > 0 && sellRate > 0) {
          rates.push({
            currencyFrom: 'ETB',
            currencyTo: currencyCode,
            buyRate,
            sellRate,
            rawText: currencyText,
          });
        }
      }
    }

    return rates;
  }

  private mapCurrency(text: string): Currency | null {
    const map: Record<string, Currency> = {
      USD: 'USD', 'US DOLLAR': 'USD', DOLLAR: 'USD',
      EUR: 'EUR', EURO: 'EUR',
      GBP: 'GBP', 'POUND STERLING': 'GBP', POUND: 'GBP',
      SAR: 'SAR', 'SAUDI RIYAL': 'SAR', RIYAL: 'SAR',
      AED: 'AED', 'UAE DIRHAM': 'AED', DIRHAM: 'AED',
      CNY: 'CNY', 'CHINESE YUAN': 'CNY', YUAN: 'CNY', RMB: 'CNY',
      JPY: 'JPY', 'JAPANESE YEN': 'JPY', YEN: 'JPY',
      CHF: 'CHF', 'SWISS FRANC': 'CHF', FRANC: 'CHF',
    };
    const upper = text.toUpperCase();
    if (map[upper]) return map[upper]!;
    for (const [key, value] of Object.entries(map)) { if (upper.includes(key)) return value; }
    const match = upper.match(/\b([A-Z]{3})\b/);
    if (match && map[match[1]!]) return map[match[1]!]!;
    return null;
  }

  private parseNumeric(text: string): number {
    const cleaned = text.replace(/[^0-9.,]/g, '').replace(/,/g, '');
    return parseFloat(cleaned) || 0;
  }
}
