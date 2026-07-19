import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScrapeExecutorService, type ScrapeJobResult } from '../services/scrape-executor.service';
import { getMsUntilNextScheduledRun, formatEAT, nowEAT } from '../utils/time';
import { ScraperRegistryService } from '../registry/scraper-registry.service';

@Injectable()
export class ScraperSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(ScraperSchedulerService.name);
  private readonly enabled: boolean;
  private readonly runIntervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  // Monitoring state
  private _lastRunStart: Date | null = null;
  private _lastRunEnd: Date | null = null;
  private _lastResults: ScrapeJobResult[] = [];
  private _totalRuns = 0;
  private _totalSuccesses = 0;
  private _totalFailures = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly executor: ScrapeExecutorService,
    private readonly registry: ScraperRegistryService,
  ) {
    this.enabled = this.configService.get<boolean>('scraper.enabled', true);
    // Check every 60 seconds if it's time to run
    this.runIntervalMs = 60_000;
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

  get isRunningNow() { return this.isRunning; }

  get nextScheduledRun(): Date {
    const ms = getMsUntilNextScheduledRun(8, 30);
    return new Date(Date.now() + ms);
  }

  /**
   * Schedule the next daily run at 08:30 EAT.
   */
  private scheduleNextRun() {
    const msUntilRun = getMsUntilNextScheduledRun(8, 30);
    const nextRun = new Date(Date.now() + msUntilRun);

    this.logger.log(`Next scrape scheduled for ${formatEAT(nextRun)} (in ${Math.round(msUntilRun / 60_000)} min)`);

    // Clear any existing timer
    if (this.timer) {
      clearInterval(this.timer);
    }

    // Set a timeout for the first run, then check every 60s
    setTimeout(() => {
      this.runScheduledScrape();
      // After the first run, check every 60s for the next day
      this.timer = setInterval(() => {
        this.runScheduledScrape();
      }, this.runIntervalMs);
    }, msUntilRun);
  }

  /**
   * Check if it's time to run and execute the scrape.
   * Uses a guard to prevent overlapping runs.
   */
  private async runScheduledScrape() {
    if (this.isRunning) {
      this.logger.warn('Previous scrape still running, skipping');
      return;
    }

    this.isRunning = true;
    this._lastRunStart = new Date();
    this._totalRuns++;

    this.logger.log(`🚀 Starting daily scrape at ${formatEAT(this._lastRunStart)}`);

    try {
      const results = await this.executor.executeAll();
      this._lastResults = results;

      const successCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;

      this._totalSuccesses += successCount;
      this._totalFailures += failedCount;

      this.logger.log(
        `🏁 Daily scrape complete: ${successCount} succeeded, ${failedCount} failed`,
      );
    } catch (error) {
      this.logger.error(`Scheduled scrape failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      this._lastRunEnd = new Date();
      this.isRunning = false;
    }
  }

  /**
   * Manually trigger a scrape run (for testing/admin).
   */
  async triggerManualRun(): Promise<ScrapeJobResult[]> {
    if (this.isRunning) {
      throw new Error('A scrape run is already in progress');
    }

    this._lastRunStart = new Date();
    this._totalRuns++;

    try {
      const results = await this.executor.executeAll();
      this._lastResults = results;

      const successCount = results.filter((r) => r.success).length;
      this._totalSuccesses += successCount;
      this._totalFailures += results.filter((r) => !r.success).length;

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
