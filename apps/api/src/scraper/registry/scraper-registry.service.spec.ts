import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ScraperRegistryService } from './scraper-registry.service';
import { getScraperCount, getAllScraperEntries } from './scraper-registry';

describe('ScraperRegistryService', () => {
  let service: ScraperRegistryService;

  const mockConfig = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'scraper.enabledBanks') return '';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScraperRegistryService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<ScraperRegistryService>(ScraperRegistryService);
  });

  describe('Registration', () => {
    it('should register all 21 banks', () => {
      expect(getScraperCount()).toBe(21);
    });

    it('should return all bank entries', () => {
      const all = getAllScraperEntries();
      expect(all.length).toBe(21);
    });
  });

  describe('Bank lookup', () => {
    it('should find CBE in the registry', () => {
      const entry = service.getEntry('CBE');
      expect(entry).toBeDefined();
      expect(entry?.metadata.name).toContain('Commercial Bank');
    });

    it('should return metadata for CBE', () => {
      const meta = service.getMetadata('CBE');
      expect(meta).toBeDefined();
      expect(meta?.website).toContain('combanketh');
    });
  });

  describe('Active banks', () => {
    it('should return all banks as active when no restriction', () => {
      const active = service.getActive();
      expect(active.length).toBe(21);
    });

    it('should check bank is enabled', () => {
      expect(service.isEnabled('CBE')).toBe(true);
    });
  });

  describe('Filtering', () => {
    it('should filter enabled banks when configured', () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'scraper.enabledBanks') return 'CBE,AWIN';
        return null;
      });

      // Re-init with new config
      const filteredService = new ScraperRegistryService(mockConfig as any);
      expect(filteredService.isEnabled('CBE')).toBe(true);
      expect(filteredService.isEnabled('DASH')).toBe(false);
    });
  });
});
