import type { ScraperMetadata, ScrapeResult, RawScrapedRate } from '../interfaces/bank-scraper.interface';
import type { Currency } from '@prisma/client';

/**
 * Abstract base class that all bank scrapers must extend.
 * Provides timing, error wrapping, and common infrastructure.
 */
export abstract class BaseScraper {
  abstract readonly metadata: ScraperMetadata;

  /**
   * Main scrape method — each scraper implements this.
   * Should return parsed rates from the bank's website.
   */
  abstract scrapeRates(): Promise<RawScrapedRate[]>;

  /**
   * Transform raw scraped data to normalized format.
   * Override if the bank returns data in a non-standard format.
   */
  transform(raw: RawScrapedRate[]): RawScrapedRate[] {
    return raw.map((r) => ({
      ...r,
      currencyFrom: r.currencyFrom ?? ('ETB' as Currency),
      buyRate: Math.abs(r.buyRate),
      sellRate: Math.abs(r.sellRate),
    }));
  }

  /**
   * Execute the full scrape lifecycle with timing and error handling.
   */
  async execute(): Promise<ScrapeResult> {
    const startTime = Date.now();
    const baseResult: Omit<ScrapeResult, 'rates' | 'rawHtml' | 'errorMessage'> = {
      success: false,
      bankId: this.metadata.slug,
      bankSlug: this.metadata.slug.toLowerCase(),
      sourceUrl: this.metadata.website,
      durationMs: 0,
      scrapeMethod: this.metadata.method,
    };

    try {
      const rawRates = await this.scrapeRates();
      const validated = this.transform(rawRates);

      return {
        ...baseResult,
        success: true,
        rates: validated,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        ...baseResult,
        success: false,
        rates: [],
        errorMessage: error instanceof Error ? error.message : 'Unknown scrape error',
        durationMs: Date.now() - startTime,
      };
    }
  }
}
