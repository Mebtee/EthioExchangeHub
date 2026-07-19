import { Test, type TestingModule } from '@nestjs/testing';
import { ExchangeRatesService } from './exchange-rates.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ExchangeRatesService', () => {
  let service: ExchangeRatesService;
  let prisma: PrismaService;

  const mockDate = new Date('2024-06-15T10:00:00Z');

  const mockRates = [
    {
      id: 'rate-1',
      bankId: 'bank-cbe',
      currencyFrom: 'ETB',
      currencyTo: 'USD',
      buyRate: 56.5,
      sellRate: 57.2,
      midRate: 56.85,
      source: 'scraped',
      effectiveDate: mockDate,
      createdAt: mockDate,
      updatedAt: mockDate,
      bank: { id: 'bank-cbe', name: 'Commercial Bank of Ethiopia', code: 'CBE' },
    },
    {
      id: 'rate-2',
      bankId: 'bank-awin',
      currencyFrom: 'ETB',
      currencyTo: 'USD',
      buyRate: 56.2,
      sellRate: 57.0,
      midRate: 56.6,
      source: 'scraped',
      effectiveDate: mockDate,
      createdAt: mockDate,
      updatedAt: mockDate,
      bank: { id: 'bank-awin', name: 'Awash International Bank', code: 'AWIN' },
    },
    {
      id: 'rate-3',
      bankId: 'bank-cbe',
      currencyFrom: 'ETB',
      currencyTo: 'EUR',
      buyRate: 61.0,
      sellRate: 61.8,
      midRate: 61.4,
      source: 'scraped',
      effectiveDate: mockDate,
      createdAt: mockDate,
      updatedAt: mockDate,
      bank: { id: 'bank-cbe', name: 'Commercial Bank of Ethiopia', code: 'CBE' },
    },
  ];

  const mockGroupByResult = [
    { bankId: 'bank-cbe', currencyTo: 'USD', _max: { effectiveDate: mockDate } },
    { bankId: 'bank-awin', currencyTo: 'USD', _max: { effectiveDate: mockDate } },
    { bankId: 'bank-cbe', currencyTo: 'EUR', _max: { effectiveDate: mockDate } },
  ];

  const mockPrisma = {
    exchangeRate: {
      findMany: jest.fn().mockResolvedValue(mockRates),
      findFirst: jest.fn().mockResolvedValue(mockRates[0]),
      count: jest.fn().mockResolvedValue(3),
      groupBy: jest.fn().mockResolvedValue(mockGroupByResult),
    },
    nbeReferenceRate: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRatesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ExchangeRatesService>(ExchangeRatesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getLatestRates', () => {
    it('should return paginated latest rates', async () => {
      const result = await service.getLatestRates({});

      expect(result.data).toHaveLength(3);
      expect(result.meta.total).toBe(3);
      expect(result.meta.page).toBe(1);
      expect(mockPrisma.exchangeRate.groupBy).toHaveBeenCalled();
    });

    it('should filter by currency via groupBy', async () => {
      await service.getLatestRates({ currencyTo: 'USD' });

      expect(mockPrisma.exchangeRate.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            currencyTo: 'USD',
          }),
        }),
      );
    });

    it('should filter by bank code via groupBy', async () => {
      await service.getLatestRates({ bankCode: 'CBE' });

      expect(mockPrisma.exchangeRate.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            bank: { code: 'CBE' },
          }),
        }),
      );
    });

    it('should paginate results correctly', async () => {
      const result = await service.getLatestRates({ page: 1, limit: 2 });

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(2);
      expect(result.meta.total).toBe(3);
      expect(result.meta.totalPages).toBe(2);
    });
  });

  describe('getHistoricalRates', () => {
    it('should return historical rates', async () => {
      const result = await service.getHistoricalRates({});

      expect(result.data).toHaveLength(3);
    });

    it('should filter by date range', async () => {
      await service.getHistoricalRates({
        fromDate: '2024-06-01',
        toDate: '2024-06-30',
      });

      expect(mockPrisma.exchangeRate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            effectiveDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('compareRates', () => {
    it('should return comparison data for a currency', async () => {
      const result = await service.compareRates({ currencyTo: 'USD' });

      expect(result.banks).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.currencyTo).toBe('USD');
    });

    it('should compute summary statistics', async () => {
      const result = await service.compareRates({ currencyTo: 'USD' });

      expect(result.summary).toBeDefined();
      expect(result.summary?.banksCount).toBeGreaterThan(0);
      expect(result.summary?.averageBuyRate).toBeGreaterThan(0);
    });
  });

  describe('getBestRates', () => {
    it('should return best buy rate', async () => {
      const result = await service.getBestRates({ currencyTo: 'USD', type: 'buy' });

      expect(result.best).toBeDefined();
      expect(result.worst).toBeDefined();
      expect(result.average).toBeGreaterThan(0);
    });

    it('should return best sell rate', async () => {
      const result = await service.getBestRates({ currencyTo: 'USD', type: 'sell' });

      expect(result.best).toBeDefined();
      expect(result.totalBanks).toBeGreaterThan(0);
    });
  });

  describe('exportCsv', () => {
    it('should generate CSV content', async () => {
      const csv = await service.exportCsv({});

      expect(csv).toContain('Bank,Currency,Buy Rate,Sell Rate');
      expect(csv).toContain('Commercial Bank of Ethiopia');
      expect(csv).toContain('USD');
    });

    it('should include headers and data rows', async () => {
      const csv = await service.exportCsv({});
      const lines = csv.split('\n');

      expect(lines.length).toBeGreaterThanOrEqual(2); // header + at least 1 row
    });
  });

  describe('exportPdf', () => {
    it('should generate a PDF buffer', async () => {
      const pdf = await service.exportPdf({});

      expect(pdf).toBeInstanceOf(Buffer);
      expect(pdf.length).toBeGreaterThan(0);
    });
  });

  describe('formatRate', () => {
    it('should calculate spread correctly', async () => {
      const result = await service.getLatestRates({});

      // rate-3: EUR (61.8 - 61.0 = 0.8) — comes first alphabetically
      const eurRate = result.data.find((r) => r.currencyTo === 'EUR')!;
      expect(eurRate.spread).toBeCloseTo(0.8, 1);

      // rate-1: CBE USD (57.2 - 56.5 = 0.7)
      const usdRate = result.data.find(
        (r) => r.currencyTo === 'USD' && r.bankCode === 'CBE',
      )!;
      expect(usdRate.spread).toBeCloseTo(0.7, 1);
    });
  });
});
