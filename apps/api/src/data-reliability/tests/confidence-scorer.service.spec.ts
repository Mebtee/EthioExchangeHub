import { Test, type TestingModule } from '@nestjs/testing';
import { ConfidenceScorerService } from '../confidence/confidence-scorer.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ConfidenceScorerService', () => {
  let service: ConfidenceScorerService;

  const mockPrisma = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfidenceScorerService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ConfidenceScorerService>(ConfidenceScorerService);
  });

  const validRates = [
    { currencyFrom: 'ETB' as any, currencyTo: 'USD' as any, buyRate: 56.5, sellRate: 57.2 },
  ];

  const passingResults = [
    { ruleName: 'Previous-Day Comparison', ruleId: 'prev-day', status: 'PASS' as const, message: 'ok' },
    { ruleName: 'Required Currency', ruleId: 'req-cur', status: 'PASS' as const, message: 'ok' },
    { ruleName: 'Spread > 0', ruleId: 'spread-0', status: 'PASS' as const, message: 'ok' },
    { ruleName: 'Spread < Max', ruleId: 'spread-max', status: 'PASS' as const, message: 'ok' },
    { ruleName: 'NBE Comparison', ruleId: 'nbe', status: 'PASS' as const, message: 'ok' },
  ];

  it('should compute perfect score with all conditions met', async () => {
    const result = await service.computeScore(
      validRates,
      'CBE',
      passingResults,
      true, // hasScreenshot
      false, // html unchanged
      { recentSuccesses: 50, recentFailures: 0 },
    );

    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('should return lower score without screenshot', async () => {
    const withScreenshot = await service.computeScore(validRates, 'CBE', passingResults, true, false, { recentSuccesses: 50, recentFailures: 0 });
    const withoutScreenshot = await service.computeScore(validRates, 'CBE', passingResults, false, false, { recentSuccesses: 50, recentFailures: 0 });

    expect(withScreenshot.score).toBeGreaterThan(withoutScreenshot.score);
    expect(withScreenshot.breakdown.screenshotCaptured).toBe(15);
    expect(withoutScreenshot.breakdown.screenshotCaptured).toBe(0);
  });

  it('should penalize for HTML structure changes', async () => {
    const stable = await service.computeScore(validRates, 'CBE', passingResults, true, false, { recentSuccesses: 50, recentFailures: 0 });
    const changed = await service.computeScore(validRates, 'CBE', passingResults, true, true, { recentSuccesses: 50, recentFailures: 0 });

    expect(stable.score).toBeGreaterThan(changed.score);
    expect(changed.breakdown.htmlStructureUnchanged).toBe(0);
  });

  it('should penalize for poor scraper history', async () => {
    const goodHistory = await service.computeScore(validRates, 'CBE', passingResults, true, false, { recentSuccesses: 50, recentFailures: 0 });
    const badHistory = await service.computeScore(validRates, 'CBE', passingResults, true, false, { recentSuccesses: 10, recentFailures: 40 });

    expect(goodHistory.score).toBeGreaterThan(badHistory.score);
  });

  it('should handle empty rates array', async () => {
    const result = await service.computeScore([], 'CBE', [], false, false, { recentSuccesses: 0, recentFailures: 0 });

    expect(result.score).toBeLessThan(50);
    expect(result.breakdown.parserCorrect).toBe(0);
  });

  it('should add manual approval bonus', async () => {
    const baseScore = 70;
    const boosted = service.addManualApprovalBonus(baseScore);
    expect(boosted).toBe(75);
  });

  it('should not exceed 100 with bonus', async () => {
    const baseScore = 99;
    const boosted = service.addManualApprovalBonus(baseScore);
    expect(boosted).toBe(100);
  });

  it('should return correct score category', () => {
    expect(service.getScoreCategory(95)).toBe('EXCELLENT');
    expect(service.getScoreCategory(80)).toBe('GOOD');
    expect(service.getScoreCategory(60)).toBe('FAIR');
    expect(service.getScoreCategory(30)).toBe('POOR');
    expect(service.getScoreCategory(10)).toBe('CRITICAL');
  });

  it('should have score between 0 and 100 inclusive', async () => {
    const result = await service.computeScore(
      validRates,
      'CBE',
      passingResults,
      true,
      false,
      { recentSuccesses: 50, recentFailures: 0 },
    );

    const breakdownSum = Object.values(result.breakdown).reduce((a, b) => a + b, 0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
    // Score may be slightly less than breakdown sum due to cap
    expect(result.score).toBeLessThanOrEqual(breakdownSum);
  });
});
