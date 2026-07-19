import { Test, type TestingModule } from '@nestjs/testing';
import { AnomalyDetectionService } from '../anomaly/anomaly-detection.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AnomalyDetectionService', () => {
  let service: AnomalyDetectionService;

  const mockPrisma = {};

  const validRates = [
    { currencyFrom: 'ETB' as any, currencyTo: 'USD' as any, buyRate: 56.5, sellRate: 57.2 },
    { currencyFrom: 'ETB' as any, currencyTo: 'EUR' as any, buyRate: 61.0, sellRate: 61.8 },
    { currencyFrom: 'ETB' as any, currencyTo: 'GBP' as any, buyRate: 71.2, sellRate: 72.0 },
    { currencyFrom: 'ETB' as any, currencyTo: 'SAR' as any, buyRate: 15.0, sellRate: 15.3 },
    { currencyFrom: 'ETB' as any, currencyTo: 'AED' as any, buyRate: 15.3, sellRate: 15.6 },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnomalyDetectionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AnomalyDetectionService>(AnomalyDetectionService);
  });

  it('should detect no anomalies for normal data', async () => {
    const results = await service.detectAnomalies(
      validRates,
      'CBE',
      'Commercial Bank of Ethiopia',
      [],
      false,
      200,
      '<html><body><table>normal</table></body></html>',
      validRates.slice(0, 2),
    );

    const criticalHigh = results.filter((r) => r.severity === 'HIGH' || r.severity === 'CRITICAL');
    expect(criticalHigh).toHaveLength(0);
  });

  it('should detect extreme rate spike', async () => {
    const previousRates = [
      { currencyFrom: 'ETB' as any, currencyTo: 'USD' as any, buyRate: 50.0, sellRate: 51.0 },
    ];
    const spikeRates = [
      { currencyFrom: 'ETB' as any, currencyTo: 'USD' as any, buyRate: 65.0, sellRate: 66.0 }, // 30% spike!
    ];

    const results = await service.detectAnomalies(
      spikeRates,
      'CBE',
      'Commercial Bank of Ethiopia',
      [],
      false,
      200,
      null,
      previousRates,
    );

    expect(results.some((r) => r.type === 'SPIKE')).toBe(true);
  });

  it('should detect Cloudflare block', async () => {
    const results = await service.detectAnomalies(
      validRates,
      'CBE',
      'CBE',
      [],
      false,
      503,
      '<html><body>Cloudflare challenge page</body></html>',
      [],
    );

    expect(results.some((r) => r.type === 'CLOUDFLARE_BLOCK')).toBe(true);
  });

  it('should detect CAPTCHA page', async () => {
    const results = await service.detectAnomalies(
      validRates,
      'CBE',
      'CBE',
      [],
      false,
      200,
      '<html><body><div class="g-recaptcha">captcha</div></body></html>',
      [],
    );

    expect(results.some((r) => r.type === 'CAPTCHA')).toBe(true);
  });

  it('should detect HTTP redirect', async () => {
    const results = await service.detectAnomalies(
      validRates,
      'CBE',
      'CBE',
      [],
      false,
      302,
      null,
      [],
    );

    expect(results.some((r) => r.type === 'HTTP_REDIRECT')).toBe(true);
  });

  it('should detect impossible values', async () => {
    const badRates = [
      { currencyFrom: 'ETB' as any, currencyTo: 'USD' as any, buyRate: -1, sellRate: Infinity },
    ];

    const results = await service.detectAnomalies(
      badRates,
      'CBE',
      'CBE',
      [],
      false,
      200,
      null,
      [],
    );

    expect(results.some((r) => r.type === 'IMPOSSIBLE_VALUE')).toBe(true);
  });

  it('should detect repeated data (all same as previous)', async () => {
    const identicalRates = [
      { currencyFrom: 'ETB' as any, currencyTo: 'USD' as any, buyRate: 56.5, sellRate: 57.2 },
      { currencyFrom: 'ETB' as any, currencyTo: 'EUR' as any, buyRate: 61.0, sellRate: 61.8 },
    ];
    const previousRates = [
      { currencyFrom: 'ETB' as any, currencyTo: 'USD' as any, buyRate: 56.5, sellRate: 57.2 },
      { currencyFrom: 'ETB' as any, currencyTo: 'EUR' as any, buyRate: 61.0, sellRate: 61.8 },
      { currencyFrom: 'ETB' as any, currencyTo: 'GBP' as any, buyRate: 70.0, sellRate: 71.0 },
    ];

    const results = await service.detectAnomalies(
      identicalRates,
      'CBE',
      'CBE',
      [],
      false,
      200,
      null,
      previousRates,
    );

    expect(results.some((r) => r.type === 'REPEATED_DATA')).toBe(true);
  });

  it('should detect parser failures from validation results', async () => {
    const failedResults = [
      { ruleName: 'Selling > Buying', ruleId: 'r1', status: 'FAIL' as const, message: 'Sell must be > buy', currencyTo: 'USD' },
      { ruleName: 'Spread < Max', ruleId: 'r2', status: 'FAIL' as const, message: 'Spread too wide', currencyTo: 'EUR' },
      { ruleName: 'Spread > 0', ruleId: 'r3', status: 'FAIL' as const, message: 'Spread must be positive', currencyTo: 'USD' },
      { ruleName: 'Required Currency', ruleId: 'r4', status: 'FAIL' as const, message: 'Missing currency', currencyTo: 'GBP' },
    ];

    const results = await service.detectAnomalies(
      validRates,
      'CBE',
      'CBE',
      failedResults,
      false,
      200,
      null,
      [],
    );

    expect(results.some((r) => r.type === 'PARSER_FAILURE')).toBe(true);
  });

  it('should detect missing currencies', async () => {
    const partialRates = [
      { currencyFrom: 'ETB' as any, currencyTo: 'USD' as any, buyRate: 56.5, sellRate: 57.2 },
      // Missing EUR, GBP, SAR, AED
    ];

    const results = await service.detectAnomalies(
      partialRates,
      'CBE',
      'CBE',
      [],
      false,
      200,
      null,
      [],
    );

    expect(results.some((r) => r.type === 'MISSING_CURRENCY')).toBe(true);
  });
});
