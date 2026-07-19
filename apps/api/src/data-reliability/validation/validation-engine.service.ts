import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { RawScrapedRate } from '../../scraper/interfaces/bank-scraper.interface';
import type { RuleResult, RuleStatus, ValidationConfig } from '../interfaces/data-reliability.interface';
import type { Currency } from '@prisma/client';

interface RateWithMetadata {
  currencyFrom: Currency;
  currencyTo: Currency;
  buyRate: number;
  sellRate: number;
  rawText?: string;
}

@Injectable()
export class ValidationEngineService {
  private readonly logger = new Logger(ValidationEngineService.name);

  // Default config — overridable via ValidationRule table
  private readonly DEFAULT_CONFIG: ValidationConfig = {
    maxSpread: 2.0,
    maxChangePercent: 5.0,
    maxNbeDeviationPercent: 10.0,
    requiredCurrencies: ['USD', 'EUR', 'GBP', 'SAR', 'AED'] as Currency[],
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run all enabled validation rules against scraped rates.
   * Returns per-rule results and overall status.
   */
  async validate(
    rates: RawScrapedRate[],
    bankId: string,
    bankSlug: string,
  ): Promise<{ results: RuleResult[]; overallStatus: RuleStatus; passedCount: number; warningCount: number; failCount: number }> {
    const startTime = Date.now();
    const results: RuleResult[] = [];

    // Get previous day's rates for comparison
    const previousRates = await this.getPreviousRates(bankSlug);

    // Get NBE reference rates
    const nbeRates = await this.getNbeReferenceRates();

    // Get config from DB (allow dynamic override)
    const config = await this.getEffectiveConfig();

    const typedRates: RateWithMetadata[] = rates.map((r) => ({
      currencyFrom: r.currencyFrom ?? 'ETB' as Currency,
      currencyTo: r.currencyTo,
      buyRate: r.buyRate,
      sellRate: r.sellRate,
      rawText: r.rawText,
    }));

    // Execute each rule
    results.push(...this.ruleSellGreaterThanBuy(typedRates));
    results.push(...this.ruleSpreadGreaterThanZero(typedRates));
    results.push(...this.ruleSpreadWithinMax(typedRates, config.maxSpread));
    results.push(...this.ruleRequiredCurrenciesExist(typedRates, config.requiredCurrencies));
    results.push(...this.ruleDuplicateDetection(typedRates));
    results.push(...this.ruleMissingValues(typedRates));
    results.push(...this.ruleInvalidDecimalFormat(typedRates));
    results.push(...this.rulePreviousDayComparison(typedRates, previousRates, config.maxChangePercent));
    results.push(...this.ruleWeeklyMovingAverage(typedRates, previousRates, config.maxChangePercent));
    results.push(...this.ruleNbeComparison(typedRates, nbeRates, config.maxNbeDeviationPercent));
    results.push(...this.ruleExtremePercentageChange(typedRates, previousRates));
    results.push(...this.ruleNegativeValues(typedRates));
    results.push(...this.ruleZeroValues(typedRates));
    results.push(...this.ruleCurrencyOrderConsistency(typedRates));
    results.push(...this.ruleEmptyTable(typedRates));

    const passedCount = results.filter((r) => r.status === 'PASS').length;
    const warningCount = results.filter((r) => r.status === 'WARNING').length;
    const failCount = results.filter((r) => r.status === 'FAIL').length;

    const overallStatus: RuleStatus = failCount > 0 ? 'FAIL' : warningCount > 0 ? 'WARNING' : 'PASS';

    this.logger.log(`Validation: ${passedCount}P / ${warningCount}W / ${failCount}F (${Date.now() - startTime}ms)`);

    return { results, overallStatus, passedCount, warningCount, failCount };
  }

  // ====== Rule Implementations ======

  private ruleSellGreaterThanBuy(rates: RateWithMetadata[]): RuleResult[] {
    return rates.map((r) => {
      const passed = r.sellRate > r.buyRate;
      return {
        ruleName: 'Selling > Buying',
        ruleId: 'sell-gt-buy',
        status: passed ? 'PASS' : 'FAIL',
        currencyTo: r.currencyTo,
        message: passed
          ? `Sell (${r.sellRate}) > Buy (${r.buyRate})`
          : `Sell rate (${r.sellRate}) must be greater than buy rate (${r.buyRate})`,
        details: passed ? undefined : { buyRate: r.buyRate, sellRate: r.sellRate },
      };
    });
  }

  private ruleSpreadGreaterThanZero(rates: RateWithMetadata[]): RuleResult[] {
    return rates.map((r) => {
      const spread = r.sellRate - r.buyRate;
      const passed = spread > 0;
      return {
        ruleName: 'Spread > 0',
        ruleId: 'spread-gt-0',
        status: passed ? 'PASS' : 'FAIL',
        currencyTo: r.currencyTo,
        message: passed
          ? `Spread ${spread.toFixed(4)}`
          : `Spread (${spread.toFixed(4)}) must be greater than 0`,
        details: passed ? undefined : { spread },
      };
    });
  }

  private ruleSpreadWithinMax(rates: RateWithMetadata[], maxSpread: number): RuleResult[] {
    return rates.map((r) => {
      const spread = r.sellRate - r.buyRate;
      const passed = spread <= maxSpread;
      return {
        ruleName: 'Spread < Max',
        ruleId: 'spread-max',
        status: passed ? 'PASS' : 'FAIL',
        currencyTo: r.currencyTo,
        message: passed
          ? `Spread ${spread.toFixed(4)} ≤ ${maxSpread}`
          : `Spread (${spread.toFixed(4)}) exceeds maximum of ${maxSpread}`,
        details: passed ? undefined : { spread, maxSpread },
      };
    });
  }

  private ruleRequiredCurrenciesExist(rates: RateWithMetadata[], required: Currency[]): RuleResult[] {
    const present = new Set(rates.map((r) => r.currencyTo));
    return required.map((currency) => {
      const passed = present.has(currency);
      return {
        ruleName: 'Required Currency',
        ruleId: 'required-currency',
        status: passed ? 'PASS' : 'FAIL',
        currencyTo: currency,
        message: passed ? `${currency} present` : `Required currency ${currency} is missing`,
        details: passed ? undefined : { missingCurrency: currency },
      };
    });
  }

  private ruleDuplicateDetection(rates: RateWithMetadata[]): RuleResult[] {
    const seen = new Map<string, number>();
    const results: RuleResult[] = [];

    for (const r of rates) {
      const key = `${r.currencyFrom}-${r.currencyTo}`;
      const count = seen.get(key) ?? 0;
      seen.set(key, count + 1);
    }

    for (const [key, count] of seen) {
      const passed = count === 1;
      results.push({
        ruleName: 'Duplicate Detection',
        ruleId: 'duplicate-detection',
        status: passed ? 'PASS' : 'FAIL',
        message: passed ? `No duplicates for ${key}` : `Duplicate currency pair found: ${key} (${count}x)`,
        details: passed ? undefined : { pair: key, count },
      });
    }

    return results;
  }

  private ruleMissingValues(rates: RateWithMetadata[]): RuleResult[] {
    return rates.map((r) => {
      const missing: string[] = [];
      if (r.buyRate == null || isNaN(r.buyRate)) missing.push('buyRate');
      if (r.sellRate == null || isNaN(r.sellRate)) missing.push('sellRate');
      if (!r.currencyTo) missing.push('currencyTo');
      const passed = missing.length === 0;
      return {
        ruleName: 'Missing Values',
        ruleId: 'missing-values',
        status: passed ? 'PASS' : 'FAIL',
        currencyTo: r.currencyTo,
        message: passed ? 'All values present' : `Missing fields: ${missing.join(', ')}`,
        details: passed ? undefined : { missing },
      };
    });
  }

  private ruleInvalidDecimalFormat(rates: RateWithMetadata[]): RuleResult[] {
    return rates.map((r) => {
      const invalid: string[] = [];
      if (!this.isValidDecimal(r.buyRate)) invalid.push('buyRate');
      if (!this.isValidDecimal(r.sellRate)) invalid.push('sellRate');
      const passed = invalid.length === 0;
      return {
        ruleName: 'Valid Decimal Format',
        ruleId: 'decimal-format',
        status: passed ? 'PASS' : 'FAIL',
        currencyTo: r.currencyTo,
        message: passed ? 'Decimal format valid' : `Invalid decimal in: ${invalid.join(', ')}`,
        details: passed ? undefined : { invalidFields: invalid, buyRate: r.buyRate, sellRate: r.sellRate },
      };
    });
  }

  private rulePreviousDayComparison(
    rates: RateWithMetadata[],
    previousRates: RateWithMetadata[],
    maxChangePercent: number,
  ): RuleResult[] {
    if (previousRates.length === 0) {
      return [{
        ruleName: 'Previous-Day Comparison',
        ruleId: 'prev-day-compare',
        status: 'WARNING',
        message: 'No previous-day data available for comparison',
      }];
    }

    return rates.map((r) => {
      const prev = previousRates.find((p) => p.currencyTo === r.currencyTo);
      if (!prev) {
        return {
          ruleName: 'Previous-Day Comparison',
          ruleId: 'prev-day-compare',
          status: 'WARNING',
          currencyTo: r.currencyTo,
          message: `No previous data for ${r.currencyTo}`,
        };
      }

      const buyChange = Math.abs(r.buyRate - prev.buyRate) / prev.buyRate * 100;
      const sellChange = Math.abs(r.sellRate - prev.sellRate) / prev.sellRate * 100;
      const maxChange = Math.max(buyChange, sellChange);
      const passed = maxChange <= maxChangePercent;

      return {
        ruleName: 'Previous-Day Comparison',
        ruleId: 'prev-day-compare',
        status: passed ? 'PASS' : 'WARNING',
        currencyTo: r.currencyTo,
        message: passed
          ? `Change within ${maxChangePercent}% (${maxChange.toFixed(1)}%)`
          : `Change of ${maxChange.toFixed(1)}% exceeds ${maxChangePercent}% threshold`,
        details: { buyChange: Math.round(buyChange * 100) / 100, sellChange: Math.round(sellChange * 100) / 100, threshold: maxChangePercent },
      };
    });
  }

  private ruleWeeklyMovingAverage(
    rates: RateWithMetadata[],
    previousRates: RateWithMetadata[],
    maxChangePercent: number,
  ): RuleResult[] {
    if (previousRates.length < 3) {
      return [{
        ruleName: 'Weekly Moving Average',
        ruleId: 'weekly-ma',
        status: 'WARNING',
        message: 'Insufficient historical data for moving average',
      }];
    }

    return rates.map((r) => {
      const prev = previousRates.find((p) => p.currencyTo === r.currencyTo);
      if (!prev) {
        return {
          ruleName: 'Weekly Moving Average',
          ruleId: 'weekly-ma',
          status: 'WARNING',
          currencyTo: r.currencyTo,
          message: `No historical data for ${r.currencyTo}`,
        };
      }

      const buyChange = Math.abs(r.buyRate - prev.buyRate) / prev.buyRate * 100;
      const passed = buyChange <= maxChangePercent * 2; // 2x threshold for weekly

      return {
        ruleName: 'Weekly Moving Average',
        ruleId: 'weekly-ma',
        status: passed ? 'PASS' : 'WARNING',
        currencyTo: r.currencyTo,
        message: passed
          ? `Within weekly bounds (${buyChange.toFixed(1)}%)`
          : `Weekly deviation of ${buyChange.toFixed(1)}% exceeds threshold`,
        details: { changePercent: Math.round(buyChange * 100) / 100, threshold: maxChangePercent * 2 },
      };
    });
  }

  private ruleNbeComparison(
    rates: RateWithMetadata[],
    nbeRates: RateWithMetadata[],
    maxDeviationPercent: number,
  ): RuleResult[] {
    if (nbeRates.length === 0) {
      return [{
        ruleName: 'NBE Comparison',
        ruleId: 'nbe-compare',
        status: 'WARNING',
        message: 'No NBE reference rates available for comparison',
      }];
    }

    return rates.map((r) => {
      const nbe = nbeRates.find((n) => n.currencyTo === r.currencyTo);
      if (!nbe) {
        return {
          ruleName: 'NBE Comparison',
          ruleId: 'nbe-compare',
          status: 'WARNING',
          currencyTo: r.currencyTo,
          message: `No NBE reference for ${r.currencyTo}`,
        };
      }

      const buyDiff = Math.abs(r.buyRate - nbe.buyRate) / nbe.buyRate * 100;
      const passed = buyDiff <= maxDeviationPercent;

      return {
        ruleName: 'NBE Comparison',
        ruleId: 'nbe-compare',
        status: passed ? 'PASS' : 'WARNING',
        currencyTo: r.currencyTo,
        message: passed
          ? `NBE deviation ${buyDiff.toFixed(1)}% within ${maxDeviationPercent}%`
          : `NBE deviation ${buyDiff.toFixed(1)}% exceeds ${maxDeviationPercent}%`,
        details: { deviationPercent: Math.round(buyDiff * 100) / 100, threshold: maxDeviationPercent, nbeRate: nbe.buyRate },
      };
    });
  }

  private ruleExtremePercentageChange(rates: RateWithMetadata[], previousRates: RateWithMetadata[]): RuleResult[] {
    return rates.map((r) => {
      const prev = previousRates.find((p) => p.currencyTo === r.currencyTo);
      if (!prev) {
        return {
          ruleName: 'Extreme Change Detection',
          ruleId: 'extreme-change',
          status: 'WARNING',
          currencyTo: r.currencyTo,
          message: `No previous data for ${r.currencyTo}`,
        };
      }

      const buyChange = Math.abs(r.buyRate - prev.buyRate) / prev.buyRate * 100;
      const isExtreme = buyChange > 20; // 20% = extreme
      const isSpike = buyChange > 10; // 10% = spike

      return {
        ruleName: 'Extreme Change Detection',
        ruleId: 'extreme-change',
        status: isExtreme ? 'FAIL' : isSpike ? 'WARNING' : 'PASS',
        currencyTo: r.currencyTo,
        message: isExtreme
          ? `EXTREME: ${buyChange.toFixed(1)}% change detected for ${r.currencyTo}`
          : isSpike
            ? `Spike: ${buyChange.toFixed(1)}% change for ${r.currencyTo}`
            : `Normal change (${buyChange.toFixed(1)}%)`,
        details: { changePercent: Math.round(buyChange * 100) / 100 },
      };
    });
  }

  private ruleNegativeValues(rates: RateWithMetadata[]): RuleResult[] {
    return rates.map((r) => {
      const negative: string[] = [];
      if (r.buyRate < 0) negative.push('buyRate');
      if (r.sellRate < 0) negative.push('sellRate');
      const passed = negative.length === 0;
      return {
        ruleName: 'Negative Values',
        ruleId: 'negative-values',
        status: passed ? 'PASS' : 'FAIL',
        currencyTo: r.currencyTo,
        message: passed ? 'No negative values' : `Negative values: ${negative.join(', ')}`,
        details: passed ? undefined : { negativeFields: negative },
      };
    });
  }

  private ruleZeroValues(rates: RateWithMetadata[]): RuleResult[] {
    return rates.map((r) => {
      const zeros: string[] = [];
      if (r.buyRate === 0) zeros.push('buyRate');
      if (r.sellRate === 0) zeros.push('sellRate');
      const passed = zeros.length === 0;
      return {
        ruleName: 'Zero Values',
        ruleId: 'zero-values',
        status: passed ? 'PASS' : 'FAIL',
        currencyTo: r.currencyTo,
        message: passed ? 'No zero values' : `Zero values: ${zeros.join(', ')}`,
        details: passed ? undefined : { zeroFields: zeros },
      };
    });
  }

  private ruleCurrencyOrderConsistency(rates: RateWithMetadata[]): RuleResult[] {
    const allFromEtb = rates.every((r) => r.currencyFrom === 'ETB');
    const passed = allFromEtb;
    return [{
      ruleName: 'Currency Order Consistency',
      ruleId: 'currency-order',
      status: passed ? 'PASS' : 'FAIL',
      message: passed ? 'All rates use ETB as base currency' : 'Inconsistent base currency detected',
      details: passed ? undefined : { rates: rates.map((r) => ({ from: r.currencyFrom, to: r.currencyTo })) },
    }];
  }

  private ruleEmptyTable(rates: RateWithMetadata[]): RuleResult[] {
    const passed = rates.length > 0;
    return [{
      ruleName: 'Empty Table Detection',
      ruleId: 'empty-table',
      status: passed ? 'PASS' : 'FAIL',
      message: passed ? `${rates.length} rates scraped` : 'No rates found — table may be empty or page structure changed',
      details: passed ? { rateCount: rates.length } : undefined,
    }];
  }

  // ====== Helpers ======

  private isValidDecimal(value: number): boolean {
    if (value == null || isNaN(value)) return false;
    if (!isFinite(value)) return false;
    // Check decimal precision (max 6 decimal places)
    const str = value.toString();
    const decimalIndex = str.indexOf('.');
    if (decimalIndex >= 0 && str.length - decimalIndex - 1 > 6) return false;
    return true;
  }

  private async getPreviousRates(bankSlug: string): Promise<RateWithMetadata[]> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const rates = await this.prisma.exchangeRate.findMany({
        where: {
          bank: { code: bankSlug },
          effectiveDate: { gte: sevenDaysAgo },
        },
        orderBy: { effectiveDate: 'desc' },
        take: 50,
      });

      return rates.map((r) => ({
        currencyFrom: r.currencyFrom as Currency,
        currencyTo: r.currencyTo as Currency,
        buyRate: Number(r.buyRate),
        sellRate: Number(r.sellRate),
      }));
    } catch {
      return [];
    }
  }

  private async getNbeReferenceRates(): Promise<RateWithMetadata[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const rates = await this.prisma.nbeReferenceRate.findMany({
        where: { effectiveDate: { gte: today } },
      });

      return rates.map((r) => ({
        currencyFrom: r.currencyFrom as Currency,
        currencyTo: r.currencyTo as Currency,
        buyRate: Number(r.buyRate),
        sellRate: Number(r.sellRate),
      }));
    } catch {
      return [];
    }
  }

  private async getEffectiveConfig(): Promise<ValidationConfig> {
    try {
      const dbRules = await this.prisma.validationRule.findMany({ where: { enabled: true } });
      if (dbRules.length === 0) return this.DEFAULT_CONFIG;

      const config = { ...this.DEFAULT_CONFIG };

      for (const rule of dbRules) {
        if (rule.config && typeof rule.config === 'object') {
          const c = rule.config as Record<string, unknown>;
          if (c.maxSpread != null) config.maxSpread = Number(c.maxSpread);
          if (c.maxChangePercent != null) config.maxChangePercent = Number(c.maxChangePercent);
          if (c.maxNbeDeviationPercent != null) config.maxNbeDeviationPercent = Number(c.maxNbeDeviationPercent);
          if (c.requiredCurrencies != null) config.requiredCurrencies = c.requiredCurrencies as Currency[];
        }
      }

      return config;
    } catch {
      return this.DEFAULT_CONFIG;
    }
  }
}
