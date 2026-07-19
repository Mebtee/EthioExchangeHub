import { Injectable } from '@nestjs/common';
import type { RegistryEntry } from '../registry/scraper-registry';
import { CBEScraper } from '../scrapers/cbe.scraper';
import { AwashScraper } from '../scrapers/awash.scraper';
import { DashenScraper } from '../scrapers/dashen.scraper';
import { GenericHtmlScraper } from '../scrapers/generic-html.scraper';
import { NbeScraper } from '../scrapers/nbe.scraper';
import { HttpClientService } from '../utils/http-client';
import type { BaseScraper } from '../scrapers/base.scraper';

/**
 * Factory that maps ScraperClass constructors to instantiation logic.
 * Adding a new bank = register a scraper class in the registry.
 * No switch statements, no if/else chains.
 */
@Injectable()
export class ScraperFactory {
  // Class-to-factory mapping — extend this when adding new scraper types
  private readonly factories = new Map<
    new (...args: never[]) => unknown,
    (entry: RegistryEntry) => BaseScraper
  >();

  constructor(private readonly httpClient: HttpClientService) {
    this.registerFactories();
  }

  private registerFactories() {
    // Custom scrapers with their own DI
    this.factories.set(CBEScraper as unknown as new (...args: never[]) => unknown, () => {
      return new CBEScraper(this.httpClient);
    });
    this.factories.set(AwashScraper as unknown as new (...args: never[]) => unknown, () => {
      return new AwashScraper(this.httpClient);
    });
    this.factories.set(DashenScraper as unknown as new (...args: never[]) => unknown, () => {
      return new DashenScraper(this.httpClient);
    });
    // Generic HTML scraper for all other banks
    this.factories.set(GenericHtmlScraper as unknown as new (...args: never[]) => unknown, (entry) => {
      return new GenericHtmlScraper(this.httpClient, entry.slug);
    });

    // NBE reference rate scraper
    this.factories.set(NbeScraper as unknown as new (...args: never[]) => unknown, () => {
      return new NbeScraper(this.httpClient);
    });
  }

  create(entry: RegistryEntry): BaseScraper {
    const factory = this.factories.get(entry.ScraperClass as unknown as new (...args: never[]) => unknown);
    if (!factory) {
      // Fallback to generic HTML scraper
      return new GenericHtmlScraper(this.httpClient, entry.slug);
    }
    return factory(entry);
  }
}
