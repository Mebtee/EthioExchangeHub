import type { ScraperMetadata, RawScrapedRate } from '../interfaces/bank-scraper.interface';
import { BaseScraper } from './base.scraper';
import { HttpClientService } from '../utils/http-client';
import * as cheerio from 'cheerio';
import type { Currency } from '@prisma/client';

export class NbeScraper extends BaseScraper {
  readonly metadata: ScraperMetadata = {
    slug: 'NBE',
    name: 'National Bank of Ethiopia',
    website: 'https://nbe.gov.et/exchange-rates',
    method: 'cheerio',
    isActive: true,
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
  };

  constructor(private readonly httpClient: HttpClientService) {
    super();
  }

  async scrapeRates(): Promise<RawScrapedRate[]> {
    const { html } = await this.httpClient.fetch({
      url: this.metadata.website,
      timeout: 30_000,
    });

    return this.parseNbeRates(html);
  }

  private parseNbeRates(html: string): RawScrapedRate[] {
    const $ = cheerio.load(html);
    const rates: RawScrapedRate[] = [];

    // NBE publishes a table with all major currencies
    const table = $('table').first();
    const rows = table.find('tr');

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

    return rates;
  }

  private mapCurrency(text: string): Currency | null {
    const map: Record<string, Currency> = {
      USD: 'USD', 'US DOLLAR': 'USD',
      EUR: 'EUR', EURO: 'EUR',
      GBP: 'GBP', 'POUND STERLING': 'GBP',
      SAR: 'SAR', 'SAUDI RIYAL': 'SAR',
      AED: 'AED', 'UAE DIRHAM': 'AED',
      CNY: 'CNY', 'CHINESE YUAN': 'CNY',
      JPY: 'JPY', 'JAPANESE YEN': 'JPY',
      CHF: 'CHF', 'SWISS FRANC': 'CHF',
    };
    return map[text] ?? null;
  }

  private parseNumeric(text: string): number {
    const cleaned = text.replace(/[^0-9.,]/g, '').replace(/,/g, '');
    return parseFloat(cleaned) || 0;
  }
}
