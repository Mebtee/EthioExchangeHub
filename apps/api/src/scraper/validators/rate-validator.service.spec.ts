import { Test, type TestingModule } from '@nestjs/testing';
import { RateValidatorService } from './rate-validator.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('RateValidatorService', () => {
  let service: RateValidatorService;
  let prisma: PrismaService;

  const mockPrisma = {
    exchangeRate: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    nbeReferenceRate: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateValidatorService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RateValidatorService>(RateValidatorService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('Rule 1: Selling > Buying', () => {
    it('should pass when sell rate exceeds buy rate', async () => {
      const result = await service.validate(
        [{ currencyFrom: 'ETB', currencyTo: 'USD', buyRate: 56.5, sellRate: 57.2 }],
        'CBE',
      );
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when sell rate <= buy rate', async () => {
      const result = await service.validate(
        [{ currencyFrom: 'ETB', currencyTo: 'USD', buyRate: 57.0, sellRate: 56.5 }],
        'CBE',
      );
      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.errors[0]?.message).toContain('greater than buying');
    });
  });

  describe('Rule 2: Spread < 2 ETB', () => {
    it('should pass when spread is under 2', async () => {
      const result = await service.validate(
        [{ currencyFrom: 'ETB', currencyTo: 'USD', buyRate: 56.0, sellRate: 57.5 }],
        'CBE',
      );
      expect(result.passed).toBe(true);
    });

    it('should fail when spread >= 2', async () => {
      const result = await service.validate(
        [{ currencyFrom: 'ETB', currencyTo: 'USD', buyRate: 55.0, sellRate: 58.0 }],
        'CBE',
      );
      expect(result.passed).toBe(false);
      expect(result.errors[0]?.message).toContain('exceeds maximum');
    });
  });

  describe('Rule 3: Required currencies exist', () => {
    it('should pass with valid currencies', async () => {
      const result = await service.validate(
        [
          { currencyFrom: 'ETB', currencyTo: 'USD', buyRate: 56.0, sellRate: 57.0 },
          { currencyFrom: 'ETB', currencyTo: 'EUR', buyRate: 60.0, sellRate: 61.0 },
        ],
        'CBE',
      );
      expect(result.passed).toBe(true);
    });
  });

  describe('Rule 6: Duplicate detection', () => {
    it('should fail when duplicate currency pairs exist', async () => {
      const result = await service.validate(
        [
          { currencyFrom: 'ETB', currencyTo: 'USD', buyRate: 56.0, sellRate: 57.0 },
          { currencyFrom: 'ETB', currencyTo: 'USD', buyRate: 56.5, sellRate: 57.5 },
        ],
        'CBE',
      );
      expect(result.passed).toBe(false);
      expect(result.errors[0]?.message).toContain('Duplicate');
    });
  });

  describe('Multiple currencies', () => {
    it('should validate multiple currency pairs', async () => {
      const result = await service.validate(
        [
          { currencyFrom: 'ETB', currencyTo: 'USD', buyRate: 56.0, sellRate: 57.0 },
          { currencyFrom: 'ETB', currencyTo: 'EUR', buyRate: 60.0, sellRate: 61.5 },
          { currencyFrom: 'ETB', currencyTo: 'GBP', buyRate: 70.0, sellRate: 71.5 },
        ],
        'CBE',
      );
      expect(result.passed).toBe(true);
    });
  });
});
