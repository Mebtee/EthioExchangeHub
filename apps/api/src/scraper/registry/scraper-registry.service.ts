import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ScraperMetadata } from '../interfaces/bank-scraper.interface';
import { PageDetectorService } from '../detection/page-detector.service';
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
import { ZemenScraper } from '../scrapers/zemen.scraper';
import { GenericHtmlScraper } from '../scrapers/generic-html.scraper';
import { NbeScraper } from '../scrapers/nbe.scraper';
import { NibScraper } from '../scrapers/nib.scraper';
import { BoaAbyssiniaScraper } from '../scrapers/boabyssinia.scraper';
import { AmharaScraper } from '../scrapers/amhara.scraper';
import { BunnaScraper } from '../scrapers/bunna.scraper';
import { BerhanScraper } from '../scrapers/berhan.scraper';
import { CoopScraper } from '../scrapers/coop.scraper';
import { EnatScraper } from '../scrapers/enat.scraper';
import { GohBetScraper } from '../scrapers/gohbet.scraper';
import {
  AbayScraper, AddisScraper, AhaduScraper, DbeScraper, GadaaScraper,
  GlobalScraper, HibretScraper, HijraScraper, LionScraper, OmoScraper,
  OibScraper, RammisScraper, ShemScraper, SidamaScraper, SiinqeeScraper,
  SiketScraper, TsedayScraper, WegagenScraper, ZamZamScraper,
} from '../scrapers/remaining.scraper';

@Injectable()
export class ScraperRegistryService implements OnModuleInit {
  private _registeredCount = 0;
  private _activeCount = 0;
  private readonly enabledBanks: string[];
  private detectionResults: Map<string, { method: string; confidence: number }> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly pageDetector: PageDetectorService,
  ) {
    const enabled = this.configService.get<string>('scraper.enabledBanks', '');
    this.enabledBanks = enabled ? enabled.split(',').map((s: string) => s.trim().toUpperCase()) : [];
  }

  onModuleInit() {
    this.registerAll();
    // Run auto-detection in background for 'detect' banks
    this.runAutoDetection();
  }

  private registerAll() {
    // ── Dedicated scrapers ──────────────────────────────
    registerScraper({ slug: 'CBE', metadata: { ...BANK_METADATA.find(m => m.slug === 'CBE')!, isActive: true }, ScraperClass: CBEScraper });
    registerScraper({ slug: 'AWIN', metadata: { ...BANK_METADATA.find(m => m.slug === 'AWIN')!, isActive: true }, ScraperClass: AwashScraper });
    registerScraper({ slug: 'DASH', metadata: { ...BANK_METADATA.find(m => m.slug === 'DASH')!, isActive: true }, ScraperClass: DashenScraper });
    registerScraper({ slug: 'ZEMEN', metadata: { ...BANK_METADATA.find(m => m.slug === 'ZEMEN')!, isActive: true }, ScraperClass: ZemenScraper });
    registerScraper({ slug: 'BOA', metadata: { ...BANK_METADATA.find(m => m.slug === 'BOA')!, isActive: true }, ScraperClass: BoaAbyssiniaScraper });
    registerScraper({ slug: 'NIB', metadata: { ...BANK_METADATA.find(m => m.slug === 'NIB')!, isActive: true }, ScraperClass: NibScraper });
    registerScraper({ slug: 'AMHARA', metadata: { ...BANK_METADATA.find(m => m.slug === 'AMHARA')!, isActive: true }, ScraperClass: AmharaScraper });
    registerScraper({ slug: 'BUNNA', metadata: { ...BANK_METADATA.find(m => m.slug === 'BUNNA')!, isActive: true }, ScraperClass: BunnaScraper });
    registerScraper({ slug: 'BIB', metadata: { ...BANK_METADATA.find(m => m.slug === 'BIB')!, isActive: true }, ScraperClass: BerhanScraper });
    registerScraper({ slug: 'COOP', metadata: { ...BANK_METADATA.find(m => m.slug === 'COOP')!, isActive: true }, ScraperClass: CoopScraper });
    registerScraper({ slug: 'ENAT', metadata: { ...BANK_METADATA.find(m => m.slug === 'ENAT')!, isActive: true }, ScraperClass: EnatScraper });
    registerScraper({ slug: 'GOHBET', metadata: { ...BANK_METADATA.find(m => m.slug === 'GOHBET')!, isActive: true }, ScraperClass: GohBetScraper });

    // ── Dynamic scrapers ────────────────────────────────
    const dynamicConfigs = [
      { slug: 'AB', ScraperClass: AbayScraper },
      { slug: 'ADDIS', ScraperClass: AddisScraper },
      { slug: 'AHADU', ScraperClass: AhaduScraper },
      { slug: 'DBE', ScraperClass: DbeScraper },
      { slug: 'GADA', ScraperClass: GadaaScraper },
      { slug: 'GB', ScraperClass: GlobalScraper },
      { slug: 'HIBRET', ScraperClass: HibretScraper },
      { slug: 'HIJRA', ScraperClass: HijraScraper },
      { slug: 'LIB', ScraperClass: LionScraper },
      { slug: 'OMO', ScraperClass: OmoScraper },
      { slug: 'OIB', ScraperClass: OibScraper },
      { slug: 'RAMMIS', ScraperClass: RammisScraper },
      { slug: 'SM', ScraperClass: ShemScraper },
      { slug: 'SIDAMA', ScraperClass: SidamaScraper },
      { slug: 'SIINQEE', ScraperClass: SiinqeeScraper },
      { slug: 'SIKET', ScraperClass: SiketScraper },
      { slug: 'TSB', ScraperClass: TsedayScraper },
      { slug: 'WB', ScraperClass: WegagenScraper },
      { slug: 'ZAMZAM', ScraperClass: ZamZamScraper },
    ];

    for (const { slug, ScraperClass } of dynamicConfigs) {
      const meta = BANK_METADATA.find(m => m.slug === slug);
      if (meta) {
        registerScraper({ slug, metadata: { ...meta, isActive: true }, ScraperClass });
      }
    }

    // ── NBE reference ──────────────────────────────────
    registerScraper({
      slug: NBE_METADATA.slug,
      metadata: NBE_METADATA,
      ScraperClass: NbeScraper as unknown as new (...args: never[]) => unknown,
    });

    this._registeredCount = getScraperCount();
    this._activeCount = getActiveScraperEntries().length;
  }

  private async runAutoDetection() {
    for (const meta of BANK_METADATA) {
      if (meta.method === 'detect') {
        try {
          const result = await this.pageDetector.detect(meta.website);
          this.detectionResults.set(meta.slug, {
            method: result.method,
            confidence: result.confidence,
          });
        } catch {
          this.detectionResults.set(meta.slug, { method: 'cheerio', confidence: 10 });
        }
      }
    }
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
    return this._activeCount;
  }

  getMetadata(slug: string): ScraperMetadata | undefined {
    return getScraperEntry(slug)?.metadata;
  }

  isEnabled(slug: string): boolean {
    if (this.enabledBanks.length === 0) return true;
    return this.enabledBanks.includes(slug.toUpperCase());
  }

  getDetectedMethods(): Array<{ slug: string; method: string; confidence: number }> {
    return Array.from(this.detectionResults.entries()).map(([slug, data]) => ({
      slug,
      method: data.method,
      confidence: data.confidence,
    }));
  }
}
