import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import type { ScraperMetadata, RawScrapedRate } from '../interfaces/bank-scraper.interface';
import type { Currency } from '@prisma/client';
import { BaseScraper } from './base.scraper';
import { BANK_METADATA } from '../registry/scraper-registry';
import { HttpClientService } from '../utils/http-client';

const CURRENCY_MAP: Record<string, Currency> = {
  USD: 'USD', US: 'USD', DOLLAR: 'USD',
  EUR: 'EUR', EURO: 'EUR',
  GBP: 'GBP', POUND: 'GBP',
  SAR: 'SAR', RIYAL: 'SAR',
  AED: 'AED', DIRHAM: 'AED',
  CNY: 'CNY', YUAN: 'CNY', RMB: 'CNY',
  JPY: 'JPY', YEN: 'JPY',
  CHF: 'CHF', FRANC: 'CHF',
};

@Injectable()
export class GenericHtmlScraper extends BaseScraper {
  metadata!: ScraperMetadata;

  constructor(
    private readonly httpClient: HttpClientService,
    slug: string,
  ) {
    super();
    const meta = BANK_METADATA.find((m) => m.slug === slug);
    if (meta) {
      this.metadata = { ...meta, isActive: true };
    } else {
      this.metadata = {
        slug,
        name: slug,
        website: '',
        method: 'cheerio',
        isActive: true,
        supportedCurrencies: ['USD', 'EUR', 'GBP'],
      };
    }
  }

  async scrapeRates(): Promise<RawScrapedRate[]> {
    if (!this.metadata.website) {
      throw new Error(`No website configured for ${this.metadata.slug}`);
    }

    const { html } = await this.httpClient.fetch({
      url: this.metadata.website,
      timeout: 30_000,
    });

    return this.parseHtmlTable(html);
  }

  /**
   * Attempts to parse exchange rates from common HTML table structures.
   * Supports multiple table layouts: column-based, row-based, and div-based.
   */
  private parseHtmlTable(html: string): RawScrapedRate[] {
    const $ = cheerio.load(html);
    const rates: RawScrapedRate[] = [];

    // Strategy 1: Look for <table> elements with rate-related content
    const tables = $('table').filter((_, el) => {
      const text = $(el).text().toLowerCase();
      return (
        text.includes('exchange') ||
        text.includes('rate') ||
        text.includes('currency') ||
        text.includes('buying') ||
        text.includes('selling') ||
        text.includes('forex')
      );
    });

    // Try each table until we find rates
    for (const table of tables) {
      const rows = $(table).find('tr');
      const headers: string[] = [];

      // Parse header row
      rows.first()
        .find('th, td')
        .each((_, cell) => {
          headers.push($(cell).text().trim().toLowerCase());
        });

      // Determine column layout
      const currencyIdx = headers.findIndex(
        (h) => h.includes('currency') || h.includes('curr') || h.includes('country') || h.includes('name'),
      );
      const buyIdx = headers.findIndex(
        (h) => h.includes('buy') || h.includes('buying') || h.includes('bid') || h.includes('cash'),
      );
      // Use the first 'selling' column as sell, or the 2nd column if buy was found
      let sellIdx = headers.findIndex(
        (h) => h.includes('sell') || h.includes('selling') || h.includes('ask') || h.includes('transfer'),
      );
      if (sellIdx === -1) {
        // Try numeric column after buy
        sellIdx = buyIdx >= 0 ? buyIdx + 1 : -1;
      }

      // Parse data rows
      for (let i = 1; i < rows.length; i++) {
        const cells = $(rows[i]).find('td');
        if (cells.length < 2) continue;

        // Extract currency code from first few characters
        const currencyText = currencyIdx >= 0
          ? $(cells[currencyIdx]).text().trim()
          : $(cells[0]).text().trim();

        const currencyCode = this.parseCurrencyCode(currencyText);
        if (!currencyCode) continue;

        const buyRate = this.parseRate(
          buyIdx >= 0 ? $(cells[buyIdx]).text().trim() : '',
        );
        const sellRate = this.parseRate(
          sellIdx >= 0 && sellIdx < cells.length
            ? $(cells[sellIdx]).text().trim()
            : $(cells[cells.length - 1]).text().trim(),
        );

        if (buyRate > 0 && sellRate > 0) {
          rates.push({
            currencyFrom: 'ETB',
            currencyTo: currencyCode,
            buyRate,
            sellRate,
            rawText: currencyText,
          });
        }
      }

      if (rates.length > 0) break;
    }

    // Strategy 2: Look for div-based layouts (no tables)
    if (rates.length === 0) {
      const rateElements = $('.rate-item, .exchange-rate-item, [class*="rate"], [class*="currency"]');
      rateElements.each((_, el) => {
        const text = $(el).text().trim();
        const match = text.match(/(USD|EUR|GBP|SAR|AED|CNY|JPY|CHF)\s*[:=]?\s*([\d,.]+)\s*[:=-]?\s*([\d,.]+)/i);
        if (match) {
          const currencyCode = this.parseCurrencyCode(match[1]!);
          if (currencyCode) {
            rates.push({
              currencyFrom: 'ETB',
              currencyTo: currencyCode,
              buyRate: this.parseRate(match[2]!),
              sellRate: this.parseRate(match[3]!),
              rawText: text,
            });
          }
        }
      });
    }

    return rates;
  }

  private parseCurrencyCode(text: string): Currency | null {
    const upper = text.toUpperCase().trim();
    // Direct match
    if (CURRENCY_MAP[upper]) return CURRENCY_MAP[upper]!;

    // Substring match
    for (const [key, value] of Object.entries(CURRENCY_MAP)) {
      if (upper.includes(key)) return value;
    }

    // Try to extract 3-letter code
    const codeMatch = upper.match(/\b([A-Z]{3})\b/);
    if (codeMatch && CURRENCY_MAP[codeMatch[1]!]) {
      return CURRENCY_MAP[codeMatch[1]!]!;
    }

    return null;
  }

  private parseRate(text: string): number {
    const cleaned = text.replace(/[^0-9.,]/g, '').replace(/,/g, '');
    return parseFloat(cleaned) || 0;
  }
}
