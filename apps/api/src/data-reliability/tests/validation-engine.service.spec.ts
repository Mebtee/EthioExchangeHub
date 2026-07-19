import { Test, type TestingModule } from '@nestjs/testing';
import { ValidationEngineService } from '../validation/validation-engine.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { RawScrapedRate } from '../../scraper/interfaces/bank-scraper.interface';

describe('ValidationEngineService', () => {
  let service: ValidationEngineService;

  const mockPrisma = {
    exchangeRate: { findMany: jest.fn().mockResolvedValue([]) },
    nbeReferenceRate: { findMany: jest.fn().mockResolvedValue([]) },
    validationRule: { findMany: jest.fn().mockResolvedValue([]) },
  };

  const validRates: RawScrapedRate[] = [
    { currencyFrom: 'ETB' as any, currencyTo: 'USD' as any, buyRate: 56.5, sellRate: 57.2 },
    { currencyFrom: 'ETB' as any, currencyTo: 'EUR' as any, buyRate: 61.0, sellRate: 61.8 },
    { currencyFrom: 'ETB' as any, currencyTo: 'GBP' as any, buyRate: 71.2, sellRate: 72.0 },
    { currencyFrom: 'ETB' as any, currencyTo: 'SAR' as any, buyRate: 15.0, sellRate: 15.3 },
    { currencyFrom: 'ETB' as any, currencyTo: 'AED' as any, buyRate: 15.3, sellRate: 15.6 },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationEngineService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ValidationEngineService>(ValidationEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validate', () => {
    it('should PASS or WARN for valid rates (WARNING = no historical data)', async () => {
      const result = await service.validate(validRates, 'bank-cbe', 'CBE');

      expect(['PASS', 'WARNING']).toContain(result.overallStatus);
      expect(result.failCount).toBe(0);
      expect(result.passedCount).toBeGreaterThan(0);
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should FAIL when sell <= buy', async () => {
      const badRates: RawScrapedRate[] = [
        { currencyFrom: 'ETB' as any, currencyTo: 'USD' as any, buyRate: 57.0, sellRate: 56.0 },
      ];
      const result = await service.validate(badRates, 'bank-cbe', 'CBE');

      const sellGtBuy = result.results.find((r) => r.ruleName === 'Selling > Buying');
      expect(sellGtBuy?.status).toBe('FAIL');
    });

    it('should FAIL when spread > max', async () => {
      const wideSpread: RawScrapedRate[] = [
        { currencyFrom: 'ETB' as any, currencyTo: 'USD' as any, buyRate: 55.0, sellRate: 60.0 },
      ];
      const result = await service.validate(wideSpread, 'bank-cbe', 'CBE');

      const spreadMax = result.results.find((r) => r.ruleName === 'Spread < Max');
      expect(spreadMax?.status).toBe('FAIL');
    });

    it('should WARN when previous day data unavailable', async () => {
      const result = await service.validate(validRates, 'bank-cbe', 'CBE');

      const prevDay = result.results.find((r) => r.ruleName === 'Previous-Day Comparison');
      expect(prevDay?.status).toBe('WARNING');
    });

    it('should FAIL when required currency missing', async () => {
      const missingCurrency: RawScrapedRate[] = [
        { currencyFrom: 'ETB' as any, currencyTo: 'USD' as any, buyRate: 56.5, sellRate: 57.2 },
      ];
      const result = await service.validate(missingCurrency, 'bank-cbe', 'CBE');

      const required = result.results.filter((r) => r.ruleName === 'Required Currency');
      const missingEur = required.find((r) => r.currencyTo === 'EUR');
      expect(missingEur?.status).toBe('FAIL');
    });

    it('should FAIL on duplicate currency pairs', async () => {
      const dupRates: RawScrapedRate[] = [
        { currencyFrom: 'ETB' as any, currencyTo: 'USD' as any, buyRate: 56.5, sellRate: 57.2 },
        { currencyFrom: 'ETB' as any, currencyTo: 'USD' as any, buyRate: 56.6, sellRate: 57.3 },
      ];
      const result = await service.validate(dupRates, 'bank-cbe', 'CBE');

      const duplicate = result.results.find((r) => r.ruleName === 'Duplicate Detection');
      expect(duplicate?.status).toBe('FAIL');
    });

    it('should FAIL on negative values', async () => {
      const negRates: RawScrapedRate[] = [
        { currencyFrom: 'ETB' as any, currencyTo: 'USD' as any, buyRate: -5, sellRate: 57.2 },
      ];
      const result = await service.validate(negRates, 'bank-cbe', 'CBE');

      const negative = result.results.find((r) => r.ruleName === 'Negative Values');
      expect(negative?.status).toBe('FAIL');
    });

    it('should FAIL on zero values', async () => {
      const zeroRates: RawScrapedRate[] = [
        { currencyFrom: 'ETB' as any, currencyTo: 'USD' as any, buyRate: 0, sellRate: 57.2 },
      ];
      const result = await service.validate(zeroRates, 'bank-cbe', 'CBE');

      const zeroVal = result.results.find((r) => r.ruleName === 'Zero Values');
      expect(zeroVal?.status).toBe('FAIL');
    });

    it('should FAIL on empty table', async () => {
      const emptyRates: RawScrapedRate[] = [];
      const result = await service.validate(emptyRates, 'bank-cbe', 'CBE');

      const emptyTable = result.results.find((r) => r.ruleName === 'Empty Table Detection');
      expect(emptyTable?.status).toBe('FAIL');
    });

    it('should WARN on extreme change', async () => {
      // Mock previous day data (return one rate)
      mockPrisma.exchangeRate.findMany.mockResolvedValueOnce([
        { buyRate: 50, sellRate: 51, currencyFrom: 'ETB', currencyTo: 'USD', effectiveDate: new Date() },
        { buyRate: 55, sellRate: 56, currencyFrom: 'ETB', currencyTo: 'EUR', effectiveDate: new Date() },
        { buyRate: 65, sellRate: 66, currencyFrom: 'ETB', currencyTo: 'GBP', effectiveDate: new Date() },
        { buyRate: 14, sellRate: 14.5, currencyFrom: 'ETB', currencyTo: 'SAR', effectiveDate: new Date() },
        { buyRate: 14, sellRate: 14.5, currencyFrom: 'ETB', currencyTo: 'AED', effectiveDate: new Date() },
      ]);

      const spikeRates: RawScrapedRate[] = [
        { currencyFrom: 'ETB' as any, currencyTo: 'USD' as any, buyRate: 70, sellRate: 71 }, // 40% change!
      ];
      const result = await service.validate(spikeRates, 'bank-cbe', 'CBE');

      const extreme = result.results.find((r) => r.ruleName === 'Extreme Change Detection');
      expect(extreme?.status).toBe('FAIL');
    });

    it('should check currency order consistency', async () => {
      const mixedRates: RawScrapedRate[] = [
        { currencyFrom: 'USD' as any, currencyTo: 'ETB' as any, buyRate: 56.5, sellRate: 57.2 },
      ];
      const result = await service.validate(mixedRates, 'bank-cbe', 'CBE');

      const order = result.results.find((r) => r.ruleName === 'Currency Order Consistency');
      expect(order?.status).toBe('FAIL');
    });

    it('should handle invalid decimal formats', async () => {
      const badDecimal: RawScrapedRate[] = [
        { currencyFrom: 'ETB' as any, currencyTo: 'USD' as any, buyRate: 56.1234567, sellRate: 57.2 }, // 7 decimals
      ];
      const result = await service.validate(badDecimal, 'bank-cbe', 'CBE');

      const decimal = result.results.find((r) => r.ruleName === 'Valid Decimal Format');
      expect(decimal?.status).toBe('FAIL');
    });
  });
});
