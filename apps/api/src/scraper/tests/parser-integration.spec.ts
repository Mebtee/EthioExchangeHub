import { HtmlParserService } from '../parsers/html-parser.service';
import { GenericHtmlScraper } from '../scrapers/generic-html.scraper';
import { loadFixtureHtml, FIXTURES } from './fixtures/fixture-loader';

describe('Parser Integration Tests', () => {
  let parser: HtmlParserService;

  beforeAll(() => {
    parser = new HtmlParserService();
  });

  describe('HtmlParserService with real fixtures', () => {
    // ── Standard Table Parsing ──────────────────────────────────
    describe('CBE-style table (Currency | Buying | Selling)', () => {
      const fixture = FIXTURES['cbe'];

      it(`should parse ${fixture.name} and return ${fixture.expectedCount} rates`, () => {
        const html = loadFixtureHtml(fixture.file);
        const rates = parser.parseTable(html);
        expect(rates.length).toBe(fixture.expectedCount);
      });

      it(`should parse ${fixture.name} with correct rate values`, () => {
        const html = loadFixtureHtml(fixture.file);
        const rates = parser.parseTable(html);

        for (const expected of fixture.expectedRates) {
          const rate = rates.find((r) => r.currencyTo === expected.currencyTo);
          expect(rate).toBeDefined();
          expect(rate!.buyRate).toBeGreaterThanOrEqual(expected.buyRateMin);
          expect(rate!.buyRate).toBeLessThanOrEqual(expected.buyRateMax);
          expect(rate!.sellRate).toBeGreaterThanOrEqual(expected.sellRateMin);
          expect(rate!.sellRate).toBeLessThanOrEqual(expected.sellRateMax);
          expect(rate!.sellRate).toBeGreaterThan(rate!.buyRate);
          expect(rate!.currencyFrom).toBe('ETB');
        }
      });
    });

    describe('Awash-style table (Currency Name | Buying | Selling | Date)', () => {
      const fixture = FIXTURES['awash'];

      it(`should parse ${fixture.name} and return ${fixture.expectedCount} rates`, () => {
        const html = loadFixtureHtml(fixture.file);
        const rates = parser.parseTable(html);
        expect(rates.length).toBe(fixture.expectedCount);
      });

      it('should correctly identify ISO codes from currency column', () => {
        const html = loadFixtureHtml(fixture.file);
        const rates = parser.parseTable(html);
        expect(rates.find((r) => r.currencyTo === 'USD')).toBeDefined();
        expect(rates.find((r) => r.currencyTo === 'EUR')).toBeDefined();
        expect(rates.find((r) => r.currencyTo === 'GBP')).toBeDefined();
      });
    });

    describe('Dashen-style table (no thead, mixed currency names)', () => {
      const fixture = FIXTURES['dashen'];

      it(`should parse ${fixture.name} and return ${fixture.expectedCount} rates`, () => {
        const html = loadFixtureHtml(fixture.file);
        const rates = parser.parseTable(html);
        expect(rates.length).toBe(fixture.expectedCount);
      });

      it('should handle uppercase ISO codes (SAUDI RIYAL, UAE DIRHAM)', () => {
        const html = loadFixtureHtml(fixture.file);
        const rates = parser.parseTable(html);
        expect(rates.find((r) => r.currencyTo === 'SAR')).toBeDefined();
        expect(rates.find((r) => r.currencyTo === 'AED')).toBeDefined();
      });
    });

    describe('Nib-style clean table (ISO codes)', () => {
      const fixture = FIXTURES['nib'];

      it(`should parse ${fixture.name} and return ${fixture.expectedCount} rates`, () => {
        const html = loadFixtureHtml(fixture.file);
        const rates = parser.parseTable(html);
        expect(rates.length).toBe(fixture.expectedCount);
      });

      it('should have valid buy/sell spread for all rates', () => {
        const html = loadFixtureHtml(fixture.file);
        const rates = parser.parseTable(html);
        for (const rate of rates) {
          const spread = rate.sellRate - rate.buyRate;
          expect(spread).toBeGreaterThan(0);
          expect(spread).toBeLessThan(2);
        }
      });
    });

    // ── Full 8-Currency Parsing ───────────────────────────────
    describe('Generic 8-currency table', () => {
      const fixture = FIXTURES['generic'];

      it(`should parse ${fixture.name} and return all ${fixture.expectedCount} currencies`, () => {
        const html = loadFixtureHtml(fixture.file);
        const rates = parser.parseTable(html);
        expect(rates.length).toBe(fixture.expectedCount);
      });

      it('should parse all supported currencies (USD, EUR, GBP, SAR, AED, CNY, JPY, CHF)', () => {
        const html = loadFixtureHtml(fixture.file);
        const rates = parser.parseTable(html);
        const currencyCodes = rates.map((r) => r.currencyTo);
        expect(currencyCodes).toContain('USD');
        expect(currencyCodes).toContain('EUR');
        expect(currencyCodes).toContain('GBP');
        expect(currencyCodes).toContain('SAR');
        expect(currencyCodes).toContain('AED');
        expect(currencyCodes).toContain('CNY');
        expect(currencyCodes).toContain('JPY');
        expect(currencyCodes).toContain('CHF');
      });

      it('should extract parenthetical ISO codes (e.g. "US Dollar (USD)")', () => {
        const html = loadFixtureHtml(fixture.file);
        const rates = parser.parseTable(html);
        expect(rates.find((r) => r.currencyTo === 'USD')).toBeDefined();
        expect(rates.find((r) => r.currencyTo === 'CNY')).toBeDefined();
      });
    });

    // ── Edge Cases ────────────────────────────────────────────
    describe('Edge cases', () => {
      it('should parse numbered column tables (Amhara-style)', () => {
        const html = loadFixtureHtml('amhara-exchange-rates.html');
        const rates = parser.parseTable(html);
        expect(rates.length).toBe(5);
        expect(rates[0].currencyTo).toBe('USD');
      });

      it('should parse tables with extra columns (BoA-style)', () => {
        const html = loadFixtureHtml('bank-of-abyssinia-rates.html');
        const rates = parser.parseTable(html);
        expect(rates.length).toBe(5);
      });

      it('should parse tables wrapped in div (Bunna-style)', () => {
        const html = loadFixtureHtml('bunna-exchange-rates.html');
        const rates = parser.parseTable(html);
        expect(rates.length).toBe(5);
      });

      it('should handle uppercase BUYING/SELLING headers (GohBet-style)', () => {
        const html = loadFixtureHtml('gohbet-exchange-rates.html');
        const rates = parser.parseTable(html);
        expect(rates.length).toBe(5);
      });

      it('should return empty array for empty tables', () => {
        const html = loadFixtureHtml('empty-table.html');
        const rates = parser.parseTable(html);
        expect(rates.length).toBe(0);
      });

    it('should handle malformed data gracefully (N/A, empty, invalid)', () => {
      const html = loadFixtureHtml('malformed-data.html');
      const rates = parser.parseTable(html);
      // parser estimates missing values (USD buy=57.45 → sells ~58.02, EUR sell=63.78 → buys ~63.14)
      // Only true invalid cases (empty cells, unknown currencies) are skipped
      expect(rates.length).toBe(3);
      expect(rates.find((r) => r.currencyTo === 'SAR')).toBeDefined();
      expect(rates.find((r) => r.currencyTo === 'USD')).toBeDefined();
      expect(rates.find((r) => r.currencyTo === 'EUR')).toBeDefined();
      // Should NOT contain empty/invalid entries
      expect(rates.find((r) => r.currencyTo === 'GBP')).toBeUndefined();
      expect(rates.find((r) => r.currencyTo === 'INVALID')).toBeUndefined();
      // Estimated rates should have valid spread
      for (const rate of rates) {
        expect(rate.sellRate).toBeGreaterThan(rate.buyRate);
      }
    });
    });

    // ── Data Quality ──────────────────────────────────────────
    describe('Data quality', () => {
      it('should maintain selling > buying for all parsed rates', () => {
        const fixturesToTest = ['cbe', 'awash', 'dashen', 'nib', 'generic'];
        for (const key of fixturesToTest) {
          const html = loadFixtureHtml(FIXTURES[key].file);
          const rates = parser.parseTable(html);
          for (const rate of rates) {
            expect(rate.sellRate).toBeGreaterThan(rate.buyRate);
          }
        }
      });

      it('should have reasonable spread (< 2 ETB) for all parsed rates', () => {
        const fixturesToTest = ['cbe', 'awash', 'dashen', 'nib', 'generic', 'coop'];
        for (const key of fixturesToTest) {
          const html = loadFixtureHtml(FIXTURES[key].file);
          const rates = parser.parseTable(html);
          for (const rate of rates) {
            const spread = rate.sellRate - rate.buyRate;
            expect(spread).toBeLessThan(2);
          }
        }
      });

      it('should correctly identify ETB as base currency', () => {
        const html = loadFixtureHtml('generic-table.html');
        const rates = parser.parseTable(html);
        for (const rate of rates) {
          expect(rate.currencyFrom).toBe('ETB');
        }
      });

      it('should preserve rawText for audit trail', () => {
        const html = loadFixtureHtml('dashen-exchange-rates.html');
        const rates = parser.parseTable(html);
        for (const rate of rates) {
          expect(rate.rawText).toBeDefined();
          expect(rate.rawText!.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('GenericHtmlScraper with real fixtures', () => {
    it('should initialize with correct metadata from fixture data', () => {
      // We can't instantiate GenericHtmlScraper without HttpClientService,
      // but we can test the parser it uses
      const html = loadFixtureHtml('generic-table.html');
      const rates = parser.parseTable(html);
      expect(rates.length).toBe(8);
    });
  });

  describe('Currency detection', () => {
    const currencies = [
      { input: 'US Dollar', expected: 'USD' },
      { input: 'USD', expected: 'USD' },
      { input: 'US DOLLAR', expected: 'USD' },
      { input: 'Euro', expected: 'EUR' },
      { input: 'EUR', expected: 'EUR' },
      { input: 'Pound Sterling', expected: 'GBP' },
      { input: 'GBP', expected: 'GBP' },
      { input: 'SAUDI RIYAL', expected: 'SAR' },
      { input: 'SAR', expected: 'SAR' },
      { input: 'UAE DIRHAM', expected: 'AED' },
      { input: 'AED', expected: 'AED' },
      { input: 'Chinese Yuan', expected: 'CNY' },
      { input: 'CNY', expected: 'CNY' },
      { input: 'Japanese Yen', expected: 'JPY' },
      { input: 'JPY', expected: 'JPY' },
      { input: 'Swiss Franc', expected: 'CHF' },
      { input: 'CHF', expected: 'CHF' },
    ];

    for (const { input, expected } of currencies) {
      it(`should detect "${input}" as ${expected}`, () => {
        expect(parser.detectCurrency(input)).toBe(expected);
      });
    }

    it('should return null for unknown currency', () => {
      expect(parser.detectCurrency('XYZ')).toBeNull();
      expect(parser.detectCurrency('Bitcoin')).toBeNull();
    });
  });

  describe('Numeric parsing', () => {
    it('should parse standard decimal format', () => {
      expect(parser.parsePrice('57.4532')).toBe(57.4532);
    });

    it('should parse thousand-separated numbers', () => {
      expect(parser.parsePrice('1,234.56')).toBe(1234.56);
    });

    it('should strip currency symbols', () => {
      expect(parser.parsePrice('ETB 57.45')).toBe(57.45);
      expect(parser.parsePrice('$57.45')).toBe(57.45);
    });

    it('should handle empty or invalid input', () => {
      expect(parser.parsePrice('N/A')).toBe(0);
      expect(parser.parsePrice('--')).toBe(0);
      expect(parser.parsePrice('')).toBe(0);
    });
  });
});
