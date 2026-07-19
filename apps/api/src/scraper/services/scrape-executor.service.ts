import { Injectable, Logger } from '@nestjs/common';
import type { ScrapeResult, RawScrapedRate } from '../interfaces/bank-scraper.interface';
import { ScraperRegistryService } from '../registry/scraper-registry.service';
import { ScraperFactory } from './scraper-factory.service';
import { HttpClientService } from '../utils/http-client';
import { HtmlParserService } from '../parsers/html-parser.service';
import { RateValidatorService } from '../validators/rate-validator.service';
import { NotificationService } from './notification.service';
import { CacheInvalidationService } from './cache-invalidation.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface ScrapeJobResult {
  bankSlug: string;
  bankName: string;
  success: boolean;
  ratesCount: number;
  errors: string[];
  warnings: string[];
  durationMs: number;
}

@Injectable()
export class ScrapeExecutorService {
  private readonly logger = new Logger(ScrapeExecutorService.name);

  constructor(
    private readonly registry: ScraperRegistryService,
    private readonly scraperFactory: ScraperFactory,
    private readonly htmlParser: HtmlParserService,
    private readonly validator: RateValidatorService,
    private readonly notification: NotificationService,
    private readonly cache: CacheInvalidationService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Execute scrape for a single bank by slug.
   */
  async executeForBank(bankSlug: string, retryAttempt = 0): Promise<ScrapeJobResult> {
    const entry = this.registry.getEntry(bankSlug);
    if (!entry) {
      return {
        bankSlug,
        bankName: bankSlug,
        success: false,
        ratesCount: 0,
        errors: [`No scraper registered for ${bankSlug}`],
        warnings: [],
        durationMs: 0,
      };
    }

    // Special handling for NBE reference rates (not a bank, stored in NbeReferenceRate table)
    if (bankSlug === 'NBE') {
      return this.executeNbeScrape(entry, retryAttempt);
    }

    const bank = await this.prisma.bank.findUnique({ where: { code: bankSlug } });
    if (!bank) {
      return {
        bankSlug,
        bankName: entry.metadata.name,
        success: false,
        ratesCount: 0,
        errors: [`Bank ${bankSlug} not found in database`],
        warnings: [],
        durationMs: 0,
      };
    }

    const startTime = Date.now();
    const logEntry = await this.createScrapeLog(bank.id, entry.metadata.website, retryAttempt);

    try {
      // Instantiate scraper dynamically via factory (no hardcoded switch)
      const scraper = this.scraperFactory.create(entry);
      const result = await scraper.execute();

      if (!result.success) {
        throw new Error(result.errorMessage ?? 'Scrape returned no data');
      }

      // Validate
      const validation = await this.validator.validate(result.rates, bankSlug);

      // Store valid rates
      if (result.rates.length > 0) {
        await this.storeRates(bank.id, result.rates);
      }

      // Update scrape log
      await this.updateScrapeLog(logEntry.id, {
        status: validation.passed ? 'SUCCESS' : 'PARTIAL',
        recordsCount: result.rates.length,
        errorMessage: validation.passed ? null : validation.errors.map((e) => e.message).join('; '),
        durationMs: Date.now() - startTime,
        validationStatus: validation.passed ? 'passed' : 'partial',
        rawResponse: result.rawHtml ?? null,
      });

      // Invalidate caches
      await this.cache.invalidateRateCaches();

      const durationMs = Date.now() - startTime;
      this.logger.log(`✅ ${entry.metadata.name}: ${result.rates.length} rates (${durationMs}ms)`);

      return {
        bankSlug,
        bankName: entry.metadata.name,
        success: true,
        ratesCount: result.rates.length,
        errors: validation.errors.map((e) => e.message),
        warnings: validation.warnings.map((w) => w.message),
        durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.updateScrapeLog(logEntry.id, {
        status: 'FAILED',
        errorMessage,
        durationMs,
        validationStatus: 'failed',
        rawResponse: null,
      });

      // Notify on failure
      await this.notification.sendFailureAlert(entry.metadata.name, errorMessage, retryAttempt, durationMs);

      this.logger.error(`❌ ${entry.metadata.name}: ${errorMessage}`);

      return {
        bankSlug,
        bankName: entry.metadata.name,
        success: false,
        ratesCount: 0,
        errors: [errorMessage],
        warnings: [],
        durationMs,
      };
    }
  }

  /**
   * Execute scrape for all active banks.
   */
  async executeAll(): Promise<ScrapeJobResult[]> {
    const activeBanks = this.registry.getActive();
    const results: ScrapeJobResult[] = [];

    for (const entry of activeBanks) {
      try {
        const result = await this.executeForBank(entry.slug);
        results.push(result);
      } catch (error) {
        results.push({
          bankSlug: entry.slug,
          bankName: entry.metadata.name,
          success: false,
          ratesCount: 0,
          errors: [error instanceof Error ? error.message : 'Unknown'],
          warnings: [],
          durationMs: 0,
        });
      }
    }

    // Send daily summary
    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);

    await this.notification.sendDailySummary(
      successCount,
      failedCount,
      totalDuration,
      results.map((r) => ({
        bank: r.bankName,
        status: r.success ? '✅' : '❌',
        duration: r.durationMs,
      })),
    );

    return results;
  }

  private async storeRates(bankId: string, rates: RawScrapedRate[]) {
    const now = new Date();
    now.setHours(10, 0, 0, 0); // 10 AM daily rate

    for (const rate of rates) {
      try {
        await this.prisma.exchangeRate.upsert({
          where: {
            bankId_currencyFrom_currencyTo_effectiveDate: {
              bankId,
              currencyFrom: rate.currencyFrom ?? 'ETB',
              currencyTo: rate.currencyTo,
              effectiveDate: now,
            },
          },
          update: {
            buyRate: rate.buyRate,
            sellRate: rate.sellRate,
            midRate: Math.round(((rate.buyRate + rate.sellRate) / 2) * 10000) / 10000,
            source: 'scraped',
          },
          create: {
            bankId,
            currencyFrom: rate.currencyFrom ?? 'ETB',
            currencyTo: rate.currencyTo,
            buyRate: rate.buyRate,
            sellRate: rate.sellRate,
            midRate: Math.round(((rate.buyRate + rate.sellRate) / 2) * 10000) / 10000,
            source: 'scraped',
            effectiveDate: now,
          },
        });
      } catch (error) {
        this.logger.warn(
          `Failed to store rate ${rate.currencyTo}: ${error instanceof Error ? error.message : 'Unknown'}`,
        );
      }
    }
  }

  /**
   * Special execution path for NBE reference rates.
   * Stores directly into NbeReferenceRate table instead of ExchangeRate.
   */
  private async executeNbeScrape(
    entry: { metadata: { name: string; website: string }; slug: string },
    retryAttempt: number,
  ): Promise<ScrapeJobResult> {
    const startTime = Date.now();
    // NBE is not a bank — create scrape log with null bankId to avoid FK violation
    const logEntry = await this.prisma.scrapeLog.create({
      data: {
        bankId: null,
        sourceUrl: entry.metadata.website,
        status: 'PENDING',
        retryAttempt,
        startedAt: new Date(),
      },
    });

    try {
      const scraper = this.scraperFactory.create({
        slug: entry.slug,
        metadata: { ...entry.metadata, isActive: true },
        ScraperClass: NbeScraper as unknown as new (...args: never[]) => unknown,
      });
      const result = await scraper.execute();

      if (!result.success || result.rates.length === 0) {
        throw new Error(result.errorMessage ?? 'NBE scrape returned no data');
      }

      // Store directly into NbeReferenceRate
      const now = new Date();
      now.setHours(10, 0, 0, 0);

      for (const rate of result.rates) {
        await this.prisma.nbeReferenceRate.upsert({
          where: {
            currencyFrom_currencyTo_effectiveDate: {
              currencyFrom: rate.currencyFrom ?? 'ETB',
              currencyTo: rate.currencyTo,
              effectiveDate: now,
            },
          },
          update: {
            buyRate: rate.buyRate,
            sellRate: rate.sellRate,
            midRate: Math.round(((rate.buyRate + rate.sellRate) / 2) * 10000) / 10000,
          },
          create: {
            currencyFrom: rate.currencyFrom ?? 'ETB',
            currencyTo: rate.currencyTo,
            buyRate: rate.buyRate,
            sellRate: rate.sellRate,
            midRate: Math.round(((rate.buyRate + rate.sellRate) / 2) * 10000) / 10000,
            effectiveDate: now,
          },
        });
      }

      await this.updateScrapeLog(logEntry.id, {
        status: 'SUCCESS',
        recordsCount: result.rates.length,
        durationMs: Date.now() - startTime,
        validationStatus: 'passed',
      });

      await this.cache.invalidateRateCaches();

      return {
        bankSlug: 'NBE',
        bankName: 'National Bank of Ethiopia',
        success: true,
        ratesCount: result.rates.length,
        errors: [],
        warnings: [],
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateScrapeLog(logEntry.id, {
        status: 'FAILED',
        errorMessage,
        durationMs: Date.now() - startTime,
        validationStatus: 'failed',
      });

      return {
        bankSlug: 'NBE',
        bankName: 'National Bank of Ethiopia',
        success: false,
        ratesCount: 0,
        errors: [errorMessage],
        warnings: [],
        durationMs: Date.now() - startTime,
      };
    }
  }

  private async createScrapeLog(bankId: string, sourceUrl: string, retryAttempt: number) {
    return this.prisma.scrapeLog.create({
      data: {
        bankId,
        sourceUrl,
        status: 'PENDING',
        retryAttempt,
        startedAt: new Date(),
      },
    });
  }

  private async updateScrapeLog(
    id: string,
    data: {
      status: string;
      recordsCount?: number | null;
      errorMessage?: string | null;
      durationMs?: number;
      validationStatus?: string | null;
      rawResponse?: string | null;
    },
  ) {
    await this.prisma.scrapeLog.update({
      where: { id },
      data: {
        status: data.status as any,
        recordsCount: data.recordsCount,
        errorMessage: data.errorMessage,
        durationMs: data.durationMs,
        validationStatus: data.validationStatus,
        rawResponse: data.rawResponse,
        completedAt: new Date(),
      },
    });
  }
}
