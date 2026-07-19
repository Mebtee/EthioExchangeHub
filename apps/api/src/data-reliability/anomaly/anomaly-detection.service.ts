import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { RawScrapedRate } from '../../scraper/interfaces/bank-scraper.interface';
import type { RuleResult } from '../interfaces/data-reliability.interface';
import type { AnomalyResult, AnomalyType } from '../interfaces/data-reliability.interface';

@Injectable()
export class AnomalyDetectionService {
  private readonly logger = new Logger(AnomalyDetectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Detect anomalies from validation results and scrape context.
   */
  async detectAnomalies(
    rates: RawScrapedRate[],
    bankSlug: string,
    bankName: string,
    validationResults: RuleResult[],
    htmlChanged: boolean,
    httpStatus: number,
    rawHtml: string | null | undefined,
    previousRates: RawScrapedRate[],
  ): Promise<AnomalyResult[]> {
    const anomalies: AnomalyResult[] = [];

    // 1. Sudden exchange-rate spike
    anomalies.push(...this.detectSpikes(rates, bankName, previousRates));

    // 2. Abnormal spread
    anomalies.push(...this.detectAbnormalSpread(rates, bankName));

    // 3. Duplicated rates (identical to previous day)
    anomalies.push(...this.detectDuplicatedRates(rates, bankName, previousRates));

    // 4. Repeated previous-day data (suspicious)
    anomalies.push(...this.detectRepeatedData(rates, bankName, previousRates));

    // 5. Impossible values
    anomalies.push(...this.detectImpossibleValues(rates, bankName));

    // 6. Parser failures
    anomalies.push(...this.detectParserFailures(validationResults, bankName));

    // 7. Unexpected HTML changes
    if (htmlChanged) {
      anomalies.push({
        type: 'HTML_CHANGE',
        severity: 'HIGH',
        description: `Unexpected HTML structure change detected for ${bankName}`,
        details: { bankSlug, bankName },
      });
    }

    // 8. Missing currencies
    anomalies.push(...this.detectMissingCurrencies(rates, bankName));

    // 9. HTTP redirects
    if (httpStatus >= 300 && httpStatus < 400) {
      anomalies.push({
        type: 'HTTP_REDIRECT',
        severity: 'MEDIUM',
        description: `HTTP redirect (${httpStatus}) detected for ${bankName}`,
        details: { httpStatus },
      });
    }

    // 10. Cloudflare blocks
    if (rawHtml && (rawHtml.includes('cloudflare') || rawHtml.includes('Cloudflare') || rawHtml.includes('cf-browser-verification'))) {
      anomalies.push({
        type: 'CLOUDFLARE_BLOCK',
        severity: 'HIGH',
        description: `Cloudflare challenge detected for ${bankName} — scraping blocked`,
        details: { bankSlug },
      });
    }

    // 11. CAPTCHA pages
    if (rawHtml && (rawHtml.includes('captcha') || rawHtml.includes('CAPTCHA') || rawHtml.includes('recaptcha'))) {
      anomalies.push({
        type: 'CAPTCHA',
        severity: 'CRITICAL',
        description: `CAPTCHA page detected for ${bankName} — automated scraping impossible`,
        details: { bankSlug },
      });
    }

    // Log if anomalies found
    if (anomalies.length > 0) {
      this.logger.warn(`Detected ${anomalies.length} anomalies for ${bankName}: ${anomalies.map((a) => a.type).join(', ')}`);
    }

    return anomalies;
  }

  private detectSpikes(rates: RawScrapedRate[], bankName: string, previousRates: RawScrapedRate[]): AnomalyResult[] {
    if (previousRates.length === 0) return [];

    return rates
      .map((r) => {
        const prev = previousRates.find((p) => p.currencyTo === r.currencyTo);
        if (!prev) return null;

        const buyChange = Math.abs(r.buyRate - prev.buyRate) / prev.buyRate * 100;
        const sellChange = Math.abs(r.sellRate - prev.sellRate) / prev.sellRate * 100;
        const maxChange = Math.max(buyChange, sellChange);

        if (maxChange > 20) {
          return {
            type: 'SPIKE' as AnomalyType,
            severity: 'CRITICAL' as const,
            description: `Extreme rate spike for ${bankName} ${r.currencyTo}: ${maxChange.toFixed(1)}% change`,
            details: { currencyTo: r.currencyTo, changePercent: Math.round(maxChange * 100) / 100, oldBuyRate: prev.buyRate, newBuyRate: r.buyRate },
          };
        }
        if (maxChange > 10) {
          return {
            type: 'SPIKE' as AnomalyType,
            severity: 'HIGH' as const,
            description: `Significant rate change for ${bankName} ${r.currencyTo}: ${maxChange.toFixed(1)}%`,
            details: { currencyTo: r.currencyTo, changePercent: Math.round(maxChange * 100) / 100 },
          };
        }
        return null;
      })
      .filter((a): a is AnomalyResult => a !== null);
  }

  private detectAbnormalSpread(rates: RawScrapedRate[], bankName: string): AnomalyResult[] {
    const TIGHT_SPREAD = 0.01; // Spread < 0.01 is suspicious
    const WIDE_SPREAD = 3.0; // Spread > 3 is suspicious

    return rates
      .map((r) => {
        const spread = r.sellRate - r.buyRate;
        if (spread < TIGHT_SPREAD) {
          return {
            type: 'ABNORMAL_SPREAD' as AnomalyType,
            severity: 'HIGH' as const,
            description: `Abnormally tight spread for ${bankName} ${r.currencyTo}: ${spread.toFixed(4)}`,
            details: { currencyTo: r.currencyTo, spread: Math.round(spread * 10000) / 10000, buyRate: r.buyRate, sellRate: r.sellRate },
          };
        }
        if (spread > WIDE_SPREAD) {
          return {
            type: 'ABNORMAL_SPREAD' as AnomalyType,
            severity: 'MEDIUM' as const,
            description: `Abnormally wide spread for ${bankName} ${r.currencyTo}: ${spread.toFixed(4)}`,
            details: { currencyTo: r.currencyTo, spread: Math.round(spread * 10000) / 10000 },
          };
        }
        return null;
      })
      .filter((a): a is AnomalyResult => a !== null);
  }

  private detectDuplicatedRates(rates: RawScrapedRate[], bankName: string, previousRates: RawScrapedRate[]): AnomalyResult[] {
    if (previousRates.length === 0) return [];

    return rates
      .map((r) => {
        const prev = previousRates.find((p) => p.currencyTo === r.currencyTo);
        if (!prev) return null;

        const isExactDuplicate = r.buyRate === prev.buyRate && r.sellRate === prev.sellRate;
        if (isExactDuplicate) {
          return {
            type: 'DUPLICATE' as AnomalyType,
            severity: 'MEDIUM' as const,
            description: `Exact duplicate rate detected for ${bankName} ${r.currencyTo} — same as previous day`,
            details: { currencyTo: r.currencyTo, buyRate: r.buyRate, sellRate: r.sellRate },
          };
        }
        return null;
      })
      .filter((a): a is AnomalyResult => a !== null);
  }

  private detectRepeatedData(rates: RawScrapedRate[], bankName: string, previousRates: RawScrapedRate[]): AnomalyResult[] {
    if (previousRates.length < 3) return [];

    const allSame = rates.every((r) => {
      const prev = previousRates.find((p) => p.currencyTo === r.currencyTo);
      return prev && r.buyRate === prev.buyRate && r.sellRate === prev.sellRate;
    });

    if (allSame) {
      return [{
        type: 'REPEATED_DATA' as AnomalyType,
        severity: 'HIGH' as const,
        description: `All rates for ${bankName} are identical to previous day — possible stale data`,
        details: { bankslug: bankName },
      }];
    }

    return [];
  }

  private detectImpossibleValues(rates: RawScrapedRate[], bankName: string): AnomalyResult[] {
    return rates
      .map((r) => {
        const impossible: string[] = [];
        if (r.buyRate < 0 || r.sellRate < 0) impossible.push('negative');
        if (r.buyRate === 0 || r.sellRate === 0) impossible.push('zero');
        if (r.buyRate > 10000 || r.sellRate > 10000) impossible.push('excessively high');
        if (isNaN(r.buyRate) || isNaN(r.sellRate)) impossible.push('NaN');
        if (!isFinite(r.buyRate) || !isFinite(r.sellRate)) impossible.push('Infinity');

        if (impossible.length > 0) {
          return {
            type: 'IMPOSSIBLE_VALUE' as AnomalyType,
            severity: 'CRITICAL' as const,
            description: `Impossible values for ${bankName} ${r.currencyTo}: ${impossible.join(', ')}`,
            details: { currencyTo: r.currencyTo, buyRate: r.buyRate, sellRate: r.sellRate, issues: impossible },
          };
        }
        return null;
      })
      .filter((a): a is AnomalyResult => a !== null);
  }

  private detectParserFailures(validationResults: RuleResult[], bankName: string): AnomalyResult[] {
    const fails = validationResults.filter((r) => r.status === 'FAIL');
    if (fails.length === 0) return [];

    // Group fails by rule
    const ruleFailCounts = new Map<string, number>();
    for (const f of fails) {
      ruleFailCounts.set(f.ruleName, (ruleFailCounts.get(f.ruleName) ?? 0) + 1);
    }

    const totalFailures = fails.length;
    const severity = (totalFailures > 5 ? 'CRITICAL' : totalFailures > 3 ? 'HIGH' : 'MEDIUM') as 'CRITICAL' | 'HIGH' | 'MEDIUM';

    return [{
      type: 'PARSER_FAILURE' as AnomalyType,
      severity,
      description: `Parser validation failed for ${bankName}: ${totalFailures} rule failures`,
      details: {
        bankName,
        totalFailures,
        ruleBreakdown: Object.fromEntries(ruleFailCounts),
        failures: fails.map((f) => ({ rule: f.ruleName, currency: f.currencyTo, message: f.message })),
      },
    }];
  }

  private detectMissingCurrencies(rates: RawScrapedRate[], bankName: string): AnomalyResult[] {
    const REQUIRED = ['USD', 'EUR', 'GBP', 'SAR', 'AED'];
    const present = new Set(rates.map((r) => r.currencyTo));
    const missing = REQUIRED.filter((c) => !present.has(c as any));

    if (missing.length > 0) {
      return [{
        type: 'MISSING_CURRENCY' as AnomalyType,
        severity: (missing.length > 2 ? 'HIGH' : 'MEDIUM') as 'HIGH' | 'MEDIUM',
        description: `Missing currencies for ${bankName}: ${missing.join(', ')}`,
        details: { bankName, missingCurrencies: missing, required: REQUIRED },
      }];
    }

    return [];
  }
}
