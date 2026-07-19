import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ScrapeExecutorService } from '../services/scrape-executor.service';
import { ScraperRegistryService } from '../registry/scraper-registry.service';
import { ScraperFactory } from '../services/scraper-factory.service';
import { HttpClientService } from '../utils/http-client';
import { HtmlParserService } from '../parsers/html-parser.service';
import { RateValidatorService } from '../validators/rate-validator.service';
import { NotificationService } from '../services/notification.service';
import { CacheInvalidationService } from '../services/cache-invalidation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PageDetectorService } from '../detection/page-detector.service';

describe('ScrapeExecutorService', () => {
  let service: ScrapeExecutorService;
  let mockPrisma: any;
  let mockValidator: any;
  let mockNotification: any;
  let mockCache: any;
  let mockRegistry: any;
  let mockFactory: any;

  beforeEach(async () => {
    mockPrisma = {
      bank: { findUnique: jest.fn().mockResolvedValue({ id: 'bank-1', code: 'TEST' }) },
      exchangeRate: { upsert: jest.fn().mockResolvedValue({}) },
      scrapeLog: { create: jest.fn().mockResolvedValue({ id: 'log-1' }), update: jest.fn().mockResolvedValue({}) },
    };

    mockValidator = {
      validate: jest.fn().mockResolvedValue({ passed: true, errors: [], warnings: [] }),
    };

    mockNotification = {
      sendFailureAlert: jest.fn().mockResolvedValue(undefined),
      sendDailySummary: jest.fn().mockResolvedValue(undefined),
    };

    mockCache = {
      invalidateRateCaches: jest.fn().mockResolvedValue(undefined),
    };

    mockRegistry = {
      getEntry: jest.fn().mockReturnValue({
        slug: 'TEST',
        metadata: { name: 'Test Bank', website: 'https://test.com', slug: 'TEST' },
        ScraperClass: class {},
      }),
      getActive: jest.fn().mockReturnValue([
        { slug: 'TEST', metadata: { name: 'Test Bank', website: 'https://test.com' }, ScraperClass: class {} },
      ]),
    };

    mockFactory = {
      create: jest.fn().mockReturnValue({
        execute: jest.fn().mockResolvedValue({
          success: true,
          rates: [
            { currencyFrom: 'ETB', currencyTo: 'USD', buyRate: 55.0, sellRate: 56.0 },
          ],
          errorMessage: null,
          rawHtml: '<html></html>',
          durationMs: 500,
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScrapeExecutorService,
        { provide: ScraperRegistryService, useValue: mockRegistry },
        { provide: ScraperFactory, useValue: mockFactory },
        { provide: HttpClientService, useValue: {} },
        { provide: HtmlParserService, useValue: { parseTable: jest.fn().mockReturnValue([]) } },
        { provide: RateValidatorService, useValue: mockValidator },
        { provide: NotificationService, useValue: mockNotification },
        { provide: CacheInvalidationService, useValue: mockCache },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ScrapeExecutorService>(ScrapeExecutorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeForBank', () => {
    it('should return failed result for unknown bank', async () => {
      mockRegistry.getEntry.mockReturnValueOnce(undefined);
      const result = await service.executeForBank('UNKNOWN');
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('No scraper registered');
    });

    it('should return failed result for bank not in database', async () => {
      mockPrisma.bank.findUnique.mockResolvedValueOnce(null);
      const result = await service.executeForBank('NONEXISTENT');
      expect(result.success).toBe(false);
    });

    it('should successfully scrape and store rates', async () => {
      const result = await service.executeForBank('TEST');
      expect(result.success).toBe(true);
      expect(result.ratesCount).toBe(1);
      expect(result.bankName).toBe('Test Bank');
    });

    it('should handle scraper execution failure', async () => {
      mockFactory.create.mockReturnValueOnce({
        execute: jest.fn().mockResolvedValue({ success: false, errorMessage: 'Scrape failed', rates: [], durationMs: 100 }),
      });
      const result = await service.executeForBank('TEST');
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Scrape failed');
    });

    it('should handle exception during scraping', async () => {
      mockFactory.create.mockReturnValueOnce({
        execute: jest.fn().mockRejectedValue(new Error('Network error')),
      });
      const result = await service.executeForBank('TEST');
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Network error');
    });

    it('should validate rates after scraping', async () => {
      await service.executeForBank('TEST');
      expect(mockValidator.validate).toHaveBeenCalled();
    });

    it('should invalidate cache after successful scrape', async () => {
      await service.executeForBank('TEST');
      expect(mockCache.invalidateRateCaches).toHaveBeenCalled();
    });
  });

  describe('executeAll', () => {
    it('should execute scrapes for all active banks', async () => {
      const results = await service.executeAll();
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it('should handle individual bank failures without stopping others', async () => {
      mockRegistry.getActive.mockReturnValueOnce([
        { slug: 'BANK1', metadata: { name: 'Bank 1' }, ScraperClass: class {} },
        { slug: 'BANK2', metadata: { name: 'Bank 2' }, ScraperClass: class {} },
      ]);

      mockFactory.create
        .mockReturnValueOnce({
          execute: jest.fn().mockResolvedValue({ success: true, rates: [], durationMs: 100, errorMessage: null, rawHtml: null }),
        })
        .mockReturnValueOnce({
          execute: jest.fn().mockRejectedValue(new Error('Failure')),
        });

      const results = await service.executeAll();
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });
});
