import { Injectable, Logger } from '@nestjs/common';
import type { RawScrapedRate, ValidationResult, ValidationError, ValidationWarning } from '../interfaces/bank-scraper.interface';
import type { Currency } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RateValidatorService {
  private readonly logger = new Logger(RateValidatorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates scraped rates against all business rules.
   */
  async validate(
    rates: RawScrapedRate[],
    bankId: string,
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Get previous day's rates for this bank
    const previousRates = await this.getPreviousRates(bankId);

    // Get NBE reference rates
    const nbeRates = await this.getNbeReferenceRates();

    for (const rate of rates) {
      // Rule 1: Selling > Buying
      if (rate.sellRate <= rate.buyRate) {
        errors.push({
          field: `sellRate/${rate.currencyTo}`,
          message: `Selling rate (${rate.sellRate}) must be greater than buying rate (${rate.buyRate})`,
          value: rate.sellRate,
          expected: `> ${rate.buyRate}`,
        });
      }

      // Rule 2: Spread < 2 ETB
      const spread = Math.abs(rate.sellRate - rate.buyRate);
      if (spread >= 2) {
        errors.push({
          field: `spread/${rate.currencyTo}`,
          message: `Spread (${spread.toFixed(4)}) exceeds maximum of 2 ETB`,
          value: spread,
          expected: '< 2',
        });
      }

      // Rule 3: Required currencies exist
      if (!rate.currencyFrom || !rate.currencyTo) {
        errors.push({
          field: 'currency',
          message: `Missing currency fields: from=${rate.currencyFrom}, to=${rate.currencyTo}`,
          value: rate,
        });
      }

      // Rule 4: Within 5% of previous day
      const prev = previousRates.find(
        (r) => r.currencyTo === rate.currencyTo,
      );
      if (prev) {
        const buyChange = Math.abs(rate.buyRate - prev.buyRate) / prev.buyRate;
        const sellChange = Math.abs(rate.sellRate - prev.sellRate) / prev.sellRate;

        if (buyChange > 0.05) {
          warnings.push({
            field: `buyRate/${rate.currencyTo}`,
            message: `Buy rate change of ${(buyChange * 100).toFixed(1)}% exceeds 5% threshold`,
            value: rate.buyRate,
          });
        }

        if (sellChange > 0.05) {
          warnings.push({
            field: `sellRate/${rate.currencyTo}`,
            message: `Sell rate change of ${(sellChange * 100).toFixed(1)}% exceeds 5% threshold`,
            value: rate.sellRate,
          });
        }
      }

      // Rule 5: Within 10% of NBE reference rate
      const nbe = nbeRates.find((r) => r.currencyTo === rate.currencyTo);
      if (nbe) {
        const buyDiff = Math.abs(rate.buyRate - nbe.buyRate) / nbe.buyRate;
        const sellDiff = Math.abs(rate.sellRate - nbe.sellRate) / nbe.sellRate;

        if (buyDiff > 0.1) {
          warnings.push({
            field: `buyRate/${rate.currencyTo}`,
            message: `Buy rate differs from NBE reference by ${(buyDiff * 100).toFixed(1)}% (max 10%)`,
            value: rate.buyRate,
            // expected: nbe.buyRate,
          });
        }

        if (sellDiff > 0.1) {
          warnings.push({
            field: `sellRate/${rate.currencyTo}`,
            message: `Sell rate differs from NBE reference by ${(sellDiff * 100).toFixed(1)}% (max 10%)`,
            value: rate.sellRate,
            // expected: nbe.sellRate,
          });
        }
      }

      // Rule 6: Reject duplicate records (handled by @@unique in Prisma)
    }

    // Rule 6: Check for duplicate currency pairs
    const seen = new Set<string>();
    for (const rate of rates) {
      const key = `${rate.currencyFrom}-${rate.currencyTo}`;
      if (seen.has(key)) {
        errors.push({
          field: `duplicate/${key}`,
          message: `Duplicate rate for ${key}`,
          value: rate,
        });
      }
      seen.add(key);
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
    };
  }

  private async getPreviousRates(bankId: string): Promise<RawScrapedRate[]> {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const rates = await this.prisma.exchangeRate.findMany({
        where: {
          bank: { code: bankId },
          effectiveDate: { gte: yesterday },
        },
        orderBy: { effectiveDate: 'desc' },
        take: 10,
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

  private async getNbeReferenceRates(): Promise<RawScrapedRate[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const rates = await this.prisma.nbeReferenceRate.findMany({
        where: {
          effectiveDate: { gte: today },
        },
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
}
