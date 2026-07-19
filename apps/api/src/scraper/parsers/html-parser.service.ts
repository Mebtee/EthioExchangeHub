import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import type { Currency } from '@prisma/client';
import type { RawScrapedRate } from '../interfaces/bank-scraper.interface';

const CURRENCY_ALIASES: Record<string, Currency> = {
  USD: 'USD', 'US DOLLAR': 'USD', DOLLAR: 'USD', '$': 'USD',
  EUR: 'EUR', EURO: 'EUR',
  GBP: 'GBP', 'POUND STERLING': 'GBP', POUND: 'GBP',
  SAR: 'SAR', 'SAUDI RIYAL': 'SAR', RIYAL: 'SAR',
  AED: 'AED', 'DIRHAM': 'AED', 'UAE DIRHAM': 'AED',
  CNY: 'CNY', 'CHINESE YUAN': 'CNY', YUAN: 'CNY', RMB: 'CNY',
  JPY: 'JPY', 'JAPANESE YEN': 'JPY', YEN: 'JPY',
  CHF: 'CHF', 'SWISS FRANC': 'CHF', FRANC: 'CHF',
};

@Injectable()
export class HtmlParserService {
  /**
   * Generic HTML table parser. Extracts currency rates from any table
   * that contains buying/selling columns.
   */
  parseTable(html: string): RawScrapedRate[] {
    const $ = cheerio.load(html);
    const rates: RawScrapedRate[] = [];

    // Find all candidate tables
    const tables = $('table').filter((_, el) => {
      const text = $(el).text().toLowerCase();
      return (
        text.includes('exchange') ||
        text.includes('buy') ||
        text.includes('sell') ||
        text.includes('currency') ||
        text.includes('rate')
      );
    });

    for (const table of tables) {
      const rows = $(table).find('tr');
      if (rows.length < 2) continue;

      // Detect column indices from header
      const headerCells = rows.first().find('th, td');
      const headers: string[] = [];
      headerCells.each((_, cell) => headers.push($(cell).text().trim().toLowerCase()));

      const buyIdx = headers.findIndex((h) => /buy|buying|bid|cash/i.test(h));
      const sellIdx = headers.findIndex((h) => /sell|selling|ask|transfer/i.test(h));
      const currencyIdx = headers.findIndex((h) => /currency|curr|country|name/i.test(h));

      // Parse data rows
      for (let i = 1; i < rows.length; i++) {
        const cells = $(rows[i]).find('td');
        if (cells.length < 2) continue;

        const currencyText = currencyIdx >= 0
          ? $(cells[currencyIdx]).text().trim()
          : $(cells[0]).text().trim();

        const currencyCode = this.detectCurrency(currencyText);
        if (!currencyCode) continue;

        let buyRate = 0;
        let sellRate = 0;

        if (buyIdx >= 0) buyRate = this.parsePrice($(cells[buyIdx]).text());
        if (sellIdx >= 0 && sellIdx < cells.length) {
          sellRate = this.parsePrice($(cells[sellIdx]).text());
        } else if (buyIdx >= 0 && buyIdx + 1 < cells.length) {
          sellRate = this.parsePrice($(cells[buyIdx + 1]).text());
        }

        if (buyRate > 0 || sellRate > 0) {
          rates.push({
            currencyFrom: 'ETB',
            currencyTo: currencyCode,
            buyRate: buyRate || sellRate * 0.99,
            sellRate: sellRate || buyRate * 1.01,
            rawText: currencyText,
          });
        }
      }

      if (rates.length > 0) break;
    }

    return rates;
  }

  /**
   * Detect currency from text using aliases.
   */
  detectCurrency(text: string): Currency | null {
    const upper = text.toUpperCase().trim();
    // Direct match
    if (CURRENCY_ALIASES[upper]) return CURRENCY_ALIASES[upper]!;
    // Substring match
    for (const [key, value] of Object.entries(CURRENCY_ALIASES)) {
      if (upper.includes(key)) return value;
    }
    // Try ISO code extraction
    const match = upper.match(/\b([A-Z]{3})\b/);
    if (match && CURRENCY_ALIASES[match[1]!]) {
      return CURRENCY_ALIASES[match[1]!]!;
    }
    return null;
  }

  /**
   * Parse numeric price from text, stripping currency symbols.
   */
  parsePrice(text: string): number {
    const cleaned = text.replace(/[^0-9.,]/g, '').replace(/,/g, '');
    return parseFloat(cleaned) || 0;
  }
}
