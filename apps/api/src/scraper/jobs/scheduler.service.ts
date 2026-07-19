import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScrapeExecutorService, type ScrapeJobResult } from '../services/scrape-executor.service';
import { ScrapeQueueService } from '../bullmq/scrape-queue.service';
import { ScraperRegistryService } from '../registry/scraper-registry.service';
import { NotificationService } from '../services/notification.service';
import { getMsUntilNextScheduledRun, formatEAT } from '../utils/time';
import { CacheInvalidationService } from '../services/cache-invalidation.service';

export interface SchedulerMetrics {
  totalRuns: number;
  totalSuccesses: number;
  totalFailures: number;
  isRunning: boolean;
  lastRunStart: string | null;
  lastRunEnd: string | null;
  nextScheduledRun: string;
  nextScheduledRunEAT: string;
  averageDurationMs: number;
  successRate: number;
  lastResults: ScrapeJobResult[];
  queueMetrics: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
}

@Injectable()
export class ScraperSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(ScraperSchedulerService.name);
  private readonly enabled: boolean;
  private readonly scheduleHour: number;
  private readonly scheduleMinute: number;
  private readonly maxRetries: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private _isRunning = false;

  // Monitoring state
  private _lastRunStart: Date | null = null;
  private _lastRunEnd: Date | null = null;
  private _lastResults: ScrapeJobResult[] = [];
  private _totalRuns = 0;
  private _totalSuccesses = 0;
  private _totalFailures = 0;
  private _totalDurationMs = 0;
  private _runsHistory: { timestamp: Date; successCount: number; failCount: number; durationMs: number }[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly executor: ScrapeExecutorService,
    private readonly queueService: ScrapeQueueService,
    private readonly registry: ScraperRegistryService,
    private readonly notification: NotificationService,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {
    this.enabled = this.configService.get<boolean>('scraper.enabled', true);
    this.scheduleHour = this.configService.get<number>('scraper.scheduleHour', 8);
    this.scheduleMinute = this.configService.get<number>('scraper.scheduleMinute', 30);
    this.maxRetries = this.configService.get<number>('scraper.maxRetries', 3);
    // Check every 60 seconds if it's time to run
  }

  onModuleInit() {
    if (this.enabled) {
      this.scheduleNextRun();
    } else {
      this.logger.log('Scraper scheduler is disabled');
    }
  }

  // ── Monitoring State ─────────────────────────────────────────
  get lastRunStart() { return this._lastRunStart; }
  get lastRunEnd() { return this._lastRunEnd; }
  get lastResults() { return this._lastResults; }
  get totalRuns() { return this._totalRuns; }
  get totalSuccesses() { return this._totalSuccesses; }
  get totalFailures() { return this._totalFailures; }
  get isRunningNow() { return this._isRunning; }

  get nextScheduledRun(): Date {
    const ms = getMsUntilNextScheduledRun(this.scheduleHour, this.scheduleMinute);
    return new Date(Date.now() + ms);
  }

  /**
   * Get comprehensive scheduler metrics.
   */
  async getSchedulerMetrics(): Promise<SchedulerMetrics> {
    const queueMetrics = await this.queueService.getMetrics();
    const avgDuration = this._totalRuns > 0
      ? Math.round(this._totalDurationMs / this._totalRuns)
      : 0;
    const successRate = this._totalRuns > 0
      ? Math.round((this._totalSuccesses / (this._totalSuccesses + this._totalFailures)) * 100)
      : 0;

    return {
      totalRuns: this._totalRuns,
      totalSuccesses: this._totalSuccesses,
      totalFailures: this._totalFailures,
      isRunning: this._isRunning,
      lastRunStart: this._lastRunStart?.toISOString() ?? null,
      lastRunEnd: this._lastRunEnd?.toISOString() ?? null,
      nextScheduledRun: this.nextScheduledRun.toISOString(),
      nextScheduledRunEAT: this.nextScheduledRun.toLocaleString('en-ET', {
        timeZone: 'Africa/Addis_Ababa',
      }),
      averageDurationMs: avgDuration,
      successRate,
      lastResults: this._lastResults,
      queueMetrics,
    };
  }

  /**
   * Get run history for charts in admin dashboard.
   */
  getRunHistory(steps = 30) {
    return this._runsHistory.slice(-steps).map((r) => ({
      timestamp: r.timestamp.toISOString(),
      successCount: r.successCount,
      failCount: r.failCount,
      durationMs: r.durationMs,
    }));
  }

  /**
   * Schedule the next daily run at configured time EAT.
   */
  private scheduleNextRun() {
    const msUntilRun = getMsUntilNextScheduledRun(this.scheduleHour, this.scheduleMinute);
    const nextRun = new Date(Date.now() + msUntilRun);

    this.logger.log(`Next scrape scheduled for ${formatEAT(nextRun)} (in ${Math.round(msUntilRun / 60_000)} min)`);

    if (this.timer) {
      clearInterval(this.timer);
    }

    // Set a timeout for the first run, then check every 60s
    setTimeout(() => {
      this.runScheduledScrape();
      this.timer = setInterval(() => {
        this.runScheduledScrape();
      }, 60_000);
    }, msUntilRun);
  }

  /**
   * Check if it's time to run and execute the scrape via BullMQ.
   * Uses a guard to prevent overlapping runs.
   */
  private async runScheduledScrape() {
    if (this._isRunning) {
      this.logger.warn('Previous scrape still running, skipping');
      return;
    }

    this._isRunning = true;
    this._lastRunStart = new Date();
    this._totalRuns++;

    this.logger.log(`🚀 Starting daily scrape at ${formatEAT(this._lastRunStart)}`);

    const runStart = Date.now();

    try {
      // Use executor directly for sequential scraping.
      // BullMQ queue is available for distributed processing but requires Redis.
      const results = await this.executor.executeAll();
      this._lastResults = results;

      const successCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;

      this._totalSuccesses += successCount;
      this._totalFailures += failedCount;
      this._totalDurationMs += Date.now() - runStart;

      // Store run history
      this._runsHistory.push({
        timestamp: new Date(),
        successCount,
        failCount: failedCount,
        durationMs: Date.now() - runStart,
      });

      // Send daily summary notification
      await this.notification.sendDailySummary(
        successCount,
        failedCount,
        Date.now() - runStart,
        results.map((r) => ({
          bank: r.bankName,
          status: r.success ? '✅' : '❌',
          duration: r.durationMs,
        })),
      );

      // Invalidate Redis cache rates after successful ingestion
      await this.cacheInvalidation.invalidateRateCaches();

      // Notify if too many failures
      if (failedCount > 0 && failedCount >= successCount) {
        await this.notification.sendFailureAlert(
          'Scheduler',
          `High failure rate: ${failedCount}/${results.length} banks failed`,
          0,
          Date.now() - runStart,
        );
      }

      this.logger.log(
        `🏁 Daily scrape complete: ${successCount} succeeded, ${failedCount} failed (${Date.now() - runStart}ms)`,
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Scheduled scrape failed: ${errorMsg}`);
      await this.notification.sendFailureAlert('Scheduler', `Scrape run failed: ${errorMsg}`, 0, Date.now() - runStart);
    } finally {
      this._lastRunEnd = new Date();
      this._isRunning = false;
    }
  }

  /**
   * Manually trigger a scrape run (for testing/admin).
   * Uses BullMQ queue for retry management.
   */
  async triggerManualRun(): Promise<ScrapeJobResult[]> {
    if (this._isRunning) {
      throw new Error('A scrape run is already in progress');
    }

    this._lastRunStart = new Date();
    this._totalRuns++;
    const runStart = Date.now();

    try {
      // Execute all scrapers sequentially
      const results = await this.executor.executeAll();
      this._lastResults = results;

      const successCount = results.filter((r) => r.success).length;
      this._totalSuccesses += successCount;
      this._totalFailures += results.filter((r) => !r.success).length;
      this._totalDurationMs += Date.now() - runStart;

      // Invalidate caches
      await this.cacheInvalidation.invalidateRateCaches();

      return results;
    } finally {
      this._lastRunEnd = new Date();
    }
  }

  /**
   * Clean up on module destroy.
   */
  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
