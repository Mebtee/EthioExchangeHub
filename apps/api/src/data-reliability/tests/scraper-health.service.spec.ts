import { Test, type TestingModule } from '@nestjs/testing';
import { ScraperHealthService } from '../health/scraper-health.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ScraperHealthService', () => {
  let service: ScraperHealthService;

  const mockPrisma = {
    bank: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'bank-1', name: 'CBE', code: 'CBE', sortOrder: 1 },
        { id: 'bank-2', name: 'Awash', code: 'AWIN', sortOrder: 2 },
      ]),
      findUnique: jest.fn().mockResolvedValue({ id: 'bank-1', name: 'CBE', code: 'CBE' }),
      count: jest.fn().mockResolvedValue(21),
    },
    scrapeLog: {
      findMany: jest.fn().mockResolvedValue([
        { status: 'SUCCESS', durationMs: 1500, validationStatus: 'passed', retryAttempt: 0 },
        { status: 'SUCCESS', durationMs: 2000, validationStatus: 'passed', retryAttempt: 0 },
        { status: 'FAILED', durationMs: 3000, validationStatus: 'failed', retryAttempt: 2 },
      ]),
      findFirst: jest.fn().mockResolvedValue({ startedAt: new Date(), status: 'SUCCESS' }),
      count: jest.fn().mockResolvedValue(10),
    },
    confidenceScore: {
      findMany: jest.fn().mockResolvedValue([
        { score: 85 },
        { score: 90 },
        { score: 75 },
      ]),
      aggregate: jest.fn().mockResolvedValue({ _avg: { score: 83 } }),
    },
    exchangeRate: {
      count: jest.fn().mockResolvedValue(1500),
    },
    scraperHealthSnapshot: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({}),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScraperHealthService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ScraperHealthService>(ScraperHealthService);
  });

  it('should return health summary for all banks', async () => {
    const results = await service.getHealthSummary();
    expect(results).toHaveLength(2);
    expect(results[0]).toHaveProperty('bankName');
    expect(results[0]).toHaveProperty('status');
    expect(results[0]).toHaveProperty('successRate7d');
  });

  it('should compute success rates correctly', async () => {
    const result = await service.getBankHealth('bank-1', 'CBE');
    expect(result.successRate7d).toBeGreaterThanOrEqual(0);
    expect(result.successRate7d).toBeLessThanOrEqual(100);
  });

  it('should return reliability metrics', async () => {
    const metrics = await service.getReliabilityMetrics();
    expect(metrics).toHaveProperty('totalPublishedRates');
    expect(metrics).toHaveProperty('averageConfidenceScore');
    expect(metrics).toHaveProperty('successRate7d');
  });

  it('should create health snapshot', async () => {
    await service.createSnapshot();
    expect(mockPrisma.scraperHealthSnapshot.create).toHaveBeenCalled();
  });
});
