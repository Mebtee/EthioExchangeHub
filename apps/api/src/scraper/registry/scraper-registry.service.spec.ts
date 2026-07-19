import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ScraperRegistryService } from './scraper-registry.service';
import { getScraperCount, getAllScraperEntries, BANK_METADATA } from './scraper-registry';
import { PageDetectorService } from '../detection/page-detector.service';

describe('ScraperRegistryService', () => {
  let service: ScraperRegistryService;

  const mockConfig = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'scraper.enabledBanks') return '';
      return null;
    }),
  };

  const mockPageDetector = {
    detect: jest.fn().mockResolvedValue({ method: 'cheerio', confidence: 80, reason: 'Mock', isTablePresent: true, isPdf: false, hasAjaxPatterns: false, hasJsonEndpoint: false, hasRateKeywords: true }),
    detectByUrl: jest.fn().mockReturnValue(null),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScraperRegistryService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: PageDetectorService, useValue: mockPageDetector },
      ],
    }).compile();

    // Initialize lifecycle hooks to trigger onModuleInit() which calls registerAll()
    await module.init();
    service = module.get<ScraperRegistryService>(ScraperRegistryService);
  });

  describe('Registration', () => {
    it('should register all 31 banks plus NBE', () => {
      expect(getScraperCount()).toBe(32); // 31 banks + 1 NBE reference
    });

    it('should return all bank entries', () => {
      const all = getAllScraperEntries();
      expect(all.length).toBe(32);
    });

    it('should match BANK_METADATA count', () => {
      expect(BANK_METADATA.length).toBe(31);
    });
  });

  describe('Bank lookup', () => {
    it('should find CBE in the registry', () => {
      const entry = service.getEntry('CBE');
      expect(entry).toBeDefined();
      expect(entry?.metadata.name).toContain('Commercial Bank');
    });

    it('should find new banks in the registry', () => {
      expect(service.getEntry('ADDIS')).toBeDefined();
      expect(service.getEntry('AHADU')).toBeDefined();
      expect(service.getEntry('OIB')).toBeDefined();
      expect(service.getEntry('ZAMZAM')).toBeDefined();
      expect(service.getEntry('SIKET')).toBeDefined();
      expect(service.getEntry('SIDAMA')).toBeDefined();
    });

    it('should return metadata', () => {
      const meta = service.getMetadata('CBE');
      expect(meta).toBeDefined();
      expect(meta?.website).toContain('combanketh');
    });
  });

  describe('Active banks', () => {
    it('should return all active banks', () => {
      const active = service.getActive();
      expect(active.length).toBeGreaterThanOrEqual(31);
    });

    it('should check bank is enabled', () => {
      expect(service.isEnabled('CBE')).toBe(true);
    });
  });

  describe('Auto-detection results', () => {
    it('should return detected methods', () => {
      const detected = service.getDetectedMethods();
      expect(Array.isArray(detected)).toBe(true);
    });
  });

  describe('Filtering', () => {
    it('should filter enabled banks when configured', () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'scraper.enabledBanks') return 'CBE,AWIN';
        return null;
      });

      const filteredService = new ScraperRegistryService(mockConfig as any, mockPageDetector as any);
      expect(filteredService.isEnabled('CBE')).toBe(true);
      expect(filteredService.isEnabled('DASH')).toBe(false);
    });
  });
});
