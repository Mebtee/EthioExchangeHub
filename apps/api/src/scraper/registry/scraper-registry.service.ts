import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ScraperMetadata, ScrapeResult } from '../interfaces/bank-scraper.interface';
import {
  registerScraper,
  getScraperEntry,
  getAllScraperEntries,
  getActiveScraperEntries,
  getScraperCount,
  BANK_METADATA,
  NBE_METADATA,
} from './scraper-registry';
import { CBEScraper } from '../scrapers/cbe.scraper';
import { AwashScraper } from '../scrapers/awash.scraper';
import { DashenScraper } from '../scrapers/dashen.scraper';
import { GenericHtmlScraper } from '../scrapers/generic-html.scraper';
import { NbeScraper } from '../scrapers/nbe.scraper';

@Injectable()
export class ScraperRegistryService implements OnModuleInit {
  private activeCount = 0;
  private readonly enabledBanks: string[];

  constructor(private readonly configService: ConfigService) {
    const enabled = this.configService.get<string>('scraper.enabledBanks', '');
    this.enabledBanks = enabled ? enabled.split(',').map((s: string) => s.trim().toUpperCase()) : [];
  }

  onModuleInit() {
    this.registerAll();
  }

  private registerAll() {
    // Register individual scrapers for banks with custom implementations
    registerScraper({ slug: 'CBE', metadata: { ...BANK_METADATA[0]!, isActive: true }, ScraperClass: CBEScraper });
    registerScraper({ slug: 'AWIN', metadata: { ...BANK_METADATA[1]!, isActive: true }, ScraperClass: AwashScraper });
    registerScraper({ slug: 'DASH', metadata: { ...BANK_METADATA[2]!, isActive: true }, ScraperClass: DashenScraper });

    // Register generic HTML scrapers for the remaining banks
    const genericBanks = BANK_METADATA.slice(3);
    for (const meta of genericBanks) {
      registerScraper({
        slug: meta.slug,
        metadata: { ...meta, isActive: true },
        ScraperClass: GenericHtmlScraper,
      });
    }

    // Register NBE reference rate scraper (not a bank, but needed for validation)
    registerScraper({
      slug: NBE_METADATA.slug,
      metadata: NBE_METADATA,
      ScraperClass: NbeScraper as unknown as new (...args: never[]) => unknown,
    });

    this.activeCount = getActiveScraperEntries().length;
  }

  getEntry(slug: string) {
    return getScraperEntry(slug);
  }

  getAll() {
    return getAllScraperEntries();
  }

  getActive() {
    const all = getActiveScraperEntries();
    if (this.enabledBanks.length === 0) return all;
    return all.filter((e) => this.enabledBanks.includes(e.slug));
  }

  getCount() {
    return getScraperCount();
  }

  getActiveCount() {
    return this.activeCount;
  }

  getMetadata(slug: string): ScraperMetadata | undefined {
    return getScraperEntry(slug)?.metadata;
  }

  isEnabled(slug: string): boolean {
    if (this.enabledBanks.length === 0) return true;
    return this.enabledBanks.includes(slug.toUpperCase());
  }
}
