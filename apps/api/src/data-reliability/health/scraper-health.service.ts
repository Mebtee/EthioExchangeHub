import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ScraperHealthSummary } from '../interfaces/data-reliability.interface';

@Injectable()
export class ScraperHealthService {
  private readonly logger = new Logger(ScraperHealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get comprehensive health summary for all banks.
   */
  async getHealthSummary(): Promise<ScraperHealthSummary[]> {
    const banks = await this.prisma.bank.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    const summaries: ScraperHealthSummary[] = [];

    for (const bank of banks) {
      const summary = await this.getBankHealth(bank.id, bank.name);
      summaries.push(summary);
    }

    return summaries;
  }

  /**
   * Get health summary for a single bank.
   */
  async getBankHealth(bankId: string, bankName: string): Promise<ScraperHealthSummary> {
    const now = new Date();

    // Get scrape logs for 7/30/90 day periods
    const [logs7d, logs30d, logs90d, latestSnapshots, lastLog, confidenceScores] = await Promise.all([
      this.getScrapeLogsSince(bankId, this.daysAgo(7)),
      this.getScrapeLogsSince(bankId, this.daysAgo(30)),
      this.getScrapeLogsSince(bankId, this.daysAgo(90)),
      this.prisma.scraperHealthSnapshot.findMany({
        where: { bankId },
        orderBy: { periodEnd: 'desc' },
        take: 3,
      }),
      this.prisma.scrapeLog.findFirst({
        where: { bankId, status: { not: 'PENDING' } },
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.confidenceScore.findMany({
        where: { bankId, createdAt: { gte: this.daysAgo(30) } },
        select: { score: true },
      }),
    ]);

    // Compute success rates
    const successRate7d = this.computeSuccessRate(logs7d);
    const successRate30d = this.computeSuccessRate(logs30d);
    const successRate90d = this.computeSuccessRate(logs90d);

    // Compute average scrape duration
    const allLogs = [...logs7d];
    const avgDuration = allLogs.length > 0
      ? Math.round(allLogs.reduce((sum, l) => sum + (l.durationMs ?? 0), 0) / allLogs.length)
      : 0;

    // Consecutive failures
    const recentLogs = await this.prisma.scrapeLog.findMany({
      where: { bankId },
      orderBy: { startedAt: 'desc' },
      take: 10,
    });
    let consecutiveFailures = 0;
    for (const log of recentLogs) {
      if (log.status === 'FAILED') consecutiveFailures++;
      else break;
    }

    // Average confidence score
    const avgConfidence = confidenceScores.length > 0
      ? Math.round(confidenceScores.reduce((sum, c) => sum + c.score, 0) / confidenceScores.length)
      : 0;

    // Validation failure rate
    const validationFails = logs30d.filter((l) => l.validationStatus === 'failed').length;
    const validationFailRate = logs30d.length > 0
      ? Math.round((validationFails / logs30d.length) * 100)
      : 0;

    // Determine status
    const status = this.determineStatus(logs7d, consecutiveFailures);

    return {
      bankId,
      bankName,
      status,
      lastSuccessfulScrape: lastLog?.status === 'SUCCESS' ? lastLog?.startedAt?.toISOString() ?? null : null,
      lastFailedScrape: lastLog?.status === 'FAILED' ? lastLog?.startedAt?.toISOString() ?? null : null,
      successRate7d,
      successRate30d,
      successRate90d,
      averageScrapeDurationMs: avgDuration,
      consecutiveFailures,
      retryCount: logs7d.reduce((sum, l) => sum + l.retryAttempt, 0),
      averageConfidenceScore: avgConfidence,
      validationFailureRate: validationFailRate,
    };
  }

  /**
   * Create a health snapshot for historical tracking.
   */
  async createSnapshot(): Promise<void> {
    const banks = await this.prisma.bank.findMany({ where: { isActive: true } });
    const now = new Date();
    const periodStart = this.daysAgo(1);
    const periodEnd = now;

    for (const bank of banks) {
      const summary = await this.getBankHealth(bank.id, bank.name);

      await this.prisma.scraperHealthSnapshot.create({
        data: {
          bankId: bank.id,
          status: summary.status,
          lastSuccessfulScrape: summary.lastSuccessfulScrape ? new Date(summary.lastSuccessfulScrape) : null,
          lastFailedScrape: summary.lastFailedScrape ? new Date(summary.lastFailedScrape) : null,
          lastScrapeDurationMs: summary.averageScrapeDurationMs,
          successRate7d: summary.successRate7d,
          successRate30d: summary.successRate30d,
          successRate90d: summary.successRate90d,
          averageScrapeDurationMs: summary.averageScrapeDurationMs,
          consecutiveFailures: summary.consecutiveFailures,
          retryCount: summary.retryCount,
          averageConfidenceScore: summary.averageConfidenceScore,
          validationFailureRate: summary.validationFailureRate,
          totalScrapes: 0,
          totalFailures: 0,
          periodStart,
          periodEnd,
        },
      });
    }

    this.logger.log(`Health snapshots created for ${banks.length} banks`);
  }

  /**
   * Get reliability metrics for dashboards.
   */
  async getReliabilityMetrics() {
    const now = new Date();
    const [banks, scrapeLogs7d, scrapeLogs30d, totalRates, avgConfidence] = await Promise.all([
      this.prisma.bank.count({ where: { isActive: true } }),
      this.prisma.scrapeLog.count({ where: { startedAt: { gte: this.daysAgo(7) } } }),
      this.prisma.scrapeLog.count({ where: { startedAt: { gte: this.daysAgo(30) } } }),
      this.prisma.exchangeRate.count(),
      this.prisma.confidenceScore.aggregate({ _avg: { score: true } }),
    ]);

    const success7d = await this.prisma.scrapeLog.count({
      where: { startedAt: { gte: this.daysAgo(7) }, status: 'SUCCESS' },
    });
    const failed7d = await this.prisma.scrapeLog.count({
      where: { startedAt: { gte: this.daysAgo(7) }, status: 'FAILED' },
    });

    return {
      banks,
      scrapeCount7d: scrapeLogs7d,
      scrapeCount30d: scrapeLogs30d,
      successRate7d: scrapeLogs7d > 0 ? Math.round((success7d / scrapeLogs7d) * 100) : 0,
      failureCount7d: failed7d,
      totalPublishedRates: totalRates,
      averageConfidenceScore: Math.round(avgConfidence._avg?.score ?? 0),
    };
  }

  private async getScrapeLogsSince(bankId: string, since: Date) {
    return this.prisma.scrapeLog.findMany({
      where: { bankId, startedAt: { gte: since } },
      select: { status: true, durationMs: true, validationStatus: true, retryAttempt: true },
    });
  }

  private computeSuccessRate(logs: { status: string }[]): number {
    if (logs.length === 0) return 0;
    const successes = logs.filter((l) => l.status === 'SUCCESS').length;
    return Math.round((successes / logs.length) * 100);
  }

  private determineStatus(logs: { status: string }[], consecutiveFailures: number): 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN' {
    if (logs.length === 0) return 'UNKNOWN';
    if (consecutiveFailures >= 5) return 'DOWN';
    if (consecutiveFailures >= 3) return 'DEGRADED';
    const successRate = this.computeSuccessRate(logs);
    if (successRate >= 80) return 'HEALTHY';
    if (successRate >= 50) return 'DEGRADED';
    return 'DOWN';
  }

  private daysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }
}
