import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import type { ScraperMetadata, RawScrapedRate } from '../interfaces/bank-scraper.interface';
import { BaseScraper } from './base.scraper';
import { HttpClientService } from '../utils/http-client';
import type { Currency } from '@prisma/client';

@Injectable()
export class AwashScraper extends BaseScraper {
  readonly metadata: ScraperMetadata = {
    slug: 'AWIN',
    name: 'Awash International Bank',
    website: 'https://awashbank.com/exchange-rate',
    method: 'cheerio',
    isActive: true,
    supportedCurrencies: ['USD', 'EUR', 'GBP'],
  };

  constructor(private readonly httpClient: HttpClientService) {
    super();
  }

  async scrapeRates(): Promise<RawScrapedRate[]> {
    const { html } = await this.httpClient.fetch({
      url: this.metadata.website,
      timeout: 30_000,
    });

    return this.parseAwashRates(html);
  }

  private parseAwashRates(html: string): RawScrapedRate[] {
    const $ = cheerio.load(html);
    const rates: RawScrapedRate[] = [];

    // Awash typically uses a table with: Currency | Buying | Selling | ...
    const tables = $('table').filter((_, el) => {
      const text = $(el).text().toLowerCase();
      return text.includes('buying') || text.includes('selling');
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
      USD: 'USD', 'US DOLLAR': 'USD',
      EUR: 'EUR', EURO: 'EUR',
      GBP: 'GBP', 'POUND STERLING': 'GBP',
    };
    return map[text] ?? null;
  }

  private parseNumeric(text: string): number {
    const cleaned = text.replace(/[^0-9.,]/g, '').replace(/,/g, '');
    return parseFloat(cleaned) || 0;
  }
}
