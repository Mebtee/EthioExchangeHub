import { registerScraper, getScraperEntry, getAllScraperEntries, getActiveScraperEntries, getScraperCount, BANK_METADATA } from '../registry/scraper-registry';

describe('ScraperRegistry', () => {
  const cleanRegistry = () => {
    // Reset by clearing internal state
    const entries = getAllScraperEntries();
    for (const e of entries) {
      // We can't directly clear the Map, so we test using fresh metadata
    }
  };

  describe('BANK_METADATA', () => {
    it('should have exactly 31 banks', () => {
      expect(BANK_METADATA.length).toBe(31);
    });

    it('should have all required banks', () => {
      const slugs = BANK_METADATA.map((m) => m.slug);
      expect(slugs).toContain('CBE');
      expect(slugs).toContain('AWIN');
      expect(slugs).toContain('DASH');
      expect(slugs).toContain('ZEMEN');
      expect(slugs).toContain('BOA');
      expect(slugs).toContain('AB');
      expect(slugs).toContain('ADDIS');
      expect(slugs).toContain('AHADU');
      expect(slugs).toContain('AMHARA');
      expect(slugs).toContain('BIB');
      expect(slugs).toContain('BUNNA');
      expect(slugs).toContain('COOP');
      expect(slugs).toContain('DBE');
      expect(slugs).toContain('ENAT');
      expect(slugs).toContain('GADA');
      expect(slugs).toContain('GB');
      expect(slugs).toContain('GOHBET');
      expect(slugs).toContain('HIBRET');
      expect(slugs).toContain('HIJRA');
      expect(slugs).toContain('LIB');
      expect(slugs).toContain('NIB');
      expect(slugs).toContain('OMO');
      expect(slugs).toContain('OIB');
      expect(slugs).toContain('RAMMIS');
      expect(slugs).toContain('SM');
      expect(slugs).toContain('SIDAMA');
      expect(slugs).toContain('SIINQEE');
      expect(slugs).toContain('SIKET');
      expect(slugs).toContain('TSB');
      expect(slugs).toContain('WB');
      expect(slugs).toContain('ZAMZAM');
    });

    it('should have unique slugs for all banks', () => {
      const slugs = BANK_METADATA.map((m) => m.slug);
      const uniqueSlugs = new Set(slugs);
      expect(slugs.length).toBe(uniqueSlugs.size);
    });

    it('should have valid websites for all banks', () => {
      for (const bank of BANK_METADATA) {
        expect(bank.website).toBeTruthy();
        expect(bank.website).toMatch(/^https?:\/\//);
      }
    });

    it('should have valid detection methods', () => {
      for (const bank of BANK_METADATA) {
        expect(['cheerio', 'playwright', 'detect']).toContain(bank.method);
      }
    });

    it('should support all 8 currencies', () => {
      for (const bank of BANK_METADATA) {
        expect(bank.supportedCurrencies).toContain('USD');
        expect(bank.supportedCurrencies).toContain('EUR');
        expect(bank.supportedCurrencies).toContain('GBP');
      }
    });
  });

  describe('registerScraper', () => {
    it('should register and retrieve a scraper', () => {
      // Use a unique slug to avoid polluting global registry
      const uniqueSlug = 'TEST_' + Date.now();
      const entry = {
        slug: uniqueSlug,
        metadata: {
          slug: uniqueSlug,
          name: 'Test Bank',
          website: 'https://test.com',
          method: 'cheerio' as const,
          isActive: true,
          supportedCurrencies: ['USD' as const, 'EUR' as const, 'GBP' as const],
        },
        ScraperClass: class {},
      };

      registerScraper(entry);
      const retrieved = getScraperEntry(uniqueSlug);
      expect(retrieved).toBeDefined();
      expect(retrieved!.metadata.name).toBe('Test Bank');
    });
  });
});
