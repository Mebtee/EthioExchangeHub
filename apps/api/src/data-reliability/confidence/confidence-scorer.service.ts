import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { RawScrapedRate } from '../../scraper/interfaces/bank-scraper.interface';
import type { RuleResult } from '../interfaces/data-reliability.interface';
import type { ConfidenceResult, ConfidenceBreakdown } from '../interfaces/data-reliability.interface';

@Injectable()
export class ConfidenceScorerService {
  private readonly logger = new Logger(ConfidenceScorerService.name);

  // Maximum possible score
  private readonly MAX_SCORE = 100;

  // Score weights (must sum to 100)
  private readonly WEIGHTS: ConfidenceBreakdown = {
    parserCorrect: 25,
    htmlStructureUnchanged: 15,
    screenshotCaptured: 15,
    previousDayComparison: 10,
    requiredCurrenciesPresent: 10,
    spreadValidation: 10,
    nbeComparison: 10,
    manualApproval: 5,
    stableScraperHistory: 10,
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compute confidence score for a set of scraped rates.
   * Score ranges from 0-100 based on multiple factors.
   */
  async computeScore(
    rates: RawScrapedRate[],
    bankSlug: string,
    validationResults: RuleResult[],
    hasScreenshot: boolean,
    hasHtmlStructureChanged: boolean,
    scraperSuccessHistory: { recentSuccesses: number; recentFailures: number },
  ): Promise<ConfidenceResult> {
    const breakdown: ConfidenceBreakdown = {
      parserCorrect: 0,
      htmlStructureUnchanged: 0,
      screenshotCaptured: 0,
      previousDayComparison: 0,
      requiredCurrenciesPresent: 0,
      spreadValidation: 0,
      nbeComparison: 0,
      manualApproval: 0,
      stableScraperHistory: 0,
    };

    // 1. Parser Correct (+25) — Parser executed without errors and produced valid rates
    if (rates.length > 0 && rates.every((r) => r.buyRate > 0 && r.sellRate > 0)) {
      breakdown.parserCorrect = this.WEIGHTS.parserCorrect;
    }

    // 2. HTML Structure Unchanged (+15) — No DOM changes detected
    if (!hasHtmlStructureChanged) {
      breakdown.htmlStructureUnchanged = this.WEIGHTS.htmlStructureUnchanged;
    }

    // 3. Screenshot Captured (+15) — Screenshot evidence exists
    if (hasScreenshot) {
      breakdown.screenshotCaptured = this.WEIGHTS.screenshotCaptured;
    }

    // 4. Previous-Day Comparison (+10) — All rates match previous day within threshold
    const prevDayResults = validationResults.filter((r) => r.ruleName === 'Previous-Day Comparison');
    if (prevDayResults.length > 0 && prevDayResults.every((r) => r.status === 'PASS')) {
      breakdown.previousDayComparison = this.WEIGHTS.previousDayComparison;
    } else if (prevDayResults.some((r) => r.status !== 'FAIL')) {
      breakdown.previousDayComparison = Math.floor(this.WEIGHTS.previousDayComparison * 0.5);
    }

    // 5. Required Currencies Present (+10) — All required currencies are present
    const requiredResults = validationResults.filter((r) => r.ruleName === 'Required Currency');
    if (requiredResults.length > 0 && requiredResults.every((r) => r.status === 'PASS')) {
      breakdown.requiredCurrenciesPresent = this.WEIGHTS.requiredCurrenciesPresent;
    } else if (requiredResults.length > 0) {
      const passCount = requiredResults.filter((r) => r.status === 'PASS').length;
      breakdown.requiredCurrenciesPresent = Math.floor(this.WEIGHTS.requiredCurrenciesPresent * (passCount / requiredResults.length));
    }

    // 6. Spread Validation (+10) — Spread rules passed
    const spreadResults = validationResults.filter((r) => r.ruleName === 'Spread > 0' || r.ruleName === 'Spread < Max');
    if (spreadResults.length > 0 && spreadResults.every((r) => r.status === 'PASS')) {
      breakdown.spreadValidation = this.WEIGHTS.spreadValidation;
    } else if (spreadResults.length > 0) {
      const passCount = spreadResults.filter((r) => r.status === 'PASS').length;
      breakdown.spreadValidation = Math.floor(this.WEIGHTS.spreadValidation * (passCount / spreadResults.length));
    }

    // 7. NBE Comparison (+10) — Rates match NBE reference within threshold
    const nbeResults = validationResults.filter((r) => r.ruleName === 'NBE Comparison');
    if (nbeResults.length > 0 && nbeResults.every((r) => r.status === 'PASS')) {
      breakdown.nbeComparison = this.WEIGHTS.nbeComparison;
    } else if (nbeResults.every((r) => r.status !== 'FAIL')) {
      breakdown.nbeComparison = Math.floor(this.WEIGHTS.nbeComparison * 0.5);
    }

    // 8. Manual Approval (+5) — Will be added when operator approves
    // This is updated later when an operator approves

    // 9. Stable Scraper History (+10) — High success rate over recent history
    const totalRecent = scraperSuccessHistory.recentSuccesses + scraperSuccessHistory.recentFailures;
    if (totalRecent > 0) {
      const successRate = scraperSuccessHistory.recentSuccesses / totalRecent;
      breakdown.stableScraperHistory = Math.floor(this.WEIGHTS.stableScraperHistory * successRate);
    }

    // Compute total score
    const totalScore = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
    const score = Math.min(this.MAX_SCORE, Math.max(0, totalScore));

    this.logger.log(`Confidence score: ${score}/100 for ${bankSlug}`);

    return { score, breakdown };
  }

  /**
   * Add manual approval bonus to an existing score.
   */
  addManualApprovalBonus(score: number): number {
    return Math.min(this.MAX_SCORE, score + this.WEIGHTS.manualApproval);
  }

  /**
   * Get score category label.
   */
  getScoreCategory(score: number): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL' {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 75) return 'GOOD';
    if (score >= 50) return 'FAIR';
    if (score >= 25) return 'POOR';
    return 'CRITICAL';
  }
}
