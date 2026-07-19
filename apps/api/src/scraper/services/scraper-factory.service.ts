import { Injectable } from '@nestjs/common';
import type { RegistryEntry } from '../registry/scraper-registry';
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
import { HttpClientService } from '../utils/http-client';
import type { BaseScraper } from '../scrapers/base.scraper';

/**
 * Factory that maps ScraperClass constructors to instantiation logic.
 * Adding a new bank = register a scraper class in the registry.
 * No switch statements, no if/else chains.
 */
@Injectable()
export class ScraperFactory {
  private readonly factories = new Map<
    new (...args: never[]) => unknown,
    (entry: RegistryEntry) => BaseScraper
  >();

  constructor(private readonly httpClient: HttpClientService) {
    this.registerFactories();
  }

  private registerFactories() {
    // ── Dedicated scrapers with custom parsing ──────────
    this.factories.set(CBEScraper as unknown as new (...args: never[]) => unknown, () => new CBEScraper(this.httpClient));
    this.factories.set(AwashScraper as unknown as new (...args: never[]) => unknown, () => new AwashScraper(this.httpClient));
    this.factories.set(DashenScraper as unknown as new (...args: never[]) => unknown, () => new DashenScraper(this.httpClient));
    this.factories.set(ZemenScraper as unknown as new (...args: never[]) => unknown, () => new ZemenScraper());
    this.factories.set(BoaAbyssiniaScraper as unknown as new (...args: never[]) => unknown, () => new BoaAbyssiniaScraper(this.httpClient));
    this.factories.set(NibScraper as unknown as new (...args: never[]) => unknown, () => new NibScraper(this.httpClient));
    this.factories.set(AmharaScraper as unknown as new (...args: never[]) => unknown, () => new AmharaScraper(this.httpClient));
    this.factories.set(BunnaScraper as unknown as new (...args: never[]) => unknown, () => new BunnaScraper(this.httpClient));
    this.factories.set(BerhanScraper as unknown as new (...args: never[]) => unknown, () => new BerhanScraper(this.httpClient));
    this.factories.set(CoopScraper as unknown as new (...args: never[]) => unknown, () => new CoopScraper(this.httpClient));
    this.factories.set(EnatScraper as unknown as new (...args: never[]) => unknown, () => new EnatScraper());
    this.factories.set(GohBetScraper as unknown as new (...args: never[]) => unknown, () => new GohBetScraper(this.httpClient));

    // ── Dynamic scrapers (factory-generated) ───────────
    const dynamicScrapers = [
      AbayScraper, AddisScraper, AhaduScraper, DbeScraper, GadaaScraper,
      GlobalScraper, HibretScraper, HijraScraper, LionScraper, OmoScraper,
      OibScraper, RammisScraper, ShemScraper, SidamaScraper, SiinqeeScraper,
      SiketScraper, TsedayScraper, WegagenScraper, ZamZamScraper,
    ] as const;

    for (const ScraperClass of dynamicScrapers) {
      this.factories.set(ScraperClass as unknown as new (...args: never[]) => unknown, (entry) => {
        const instance = new (ScraperClass as any)(this.httpClient);
        return instance as BaseScraper;
      });
    }

    // ── Generic HTML fallback ──────────────────────────
    this.factories.set(GenericHtmlScraper as unknown as new (...args: never[]) => unknown, (entry) => {
      return new GenericHtmlScraper(this.httpClient, entry.slug);
    });

    // ── NBE reference rate scraper ─────────────────────
    this.factories.set(NbeScraper as unknown as new (...args: never[]) => unknown, () => new NbeScraper(this.httpClient));
  }

  create(entry: RegistryEntry): BaseScraper {
    const factory = this.factories.get(entry.ScraperClass as unknown as new (...args: never[]) => unknown);
    if (!factory) {
      return new GenericHtmlScraper(this.httpClient, entry.slug);
    }
    return factory(entry);
  }
}
