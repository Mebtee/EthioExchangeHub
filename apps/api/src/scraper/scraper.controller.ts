import { Controller, Get, Post, Param, UseGuards, Logger } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ScraperSchedulerService } from './jobs/scheduler.service';
import { ScraperRegistryService } from './registry/scraper-registry.service';
import { ScrapeQueueService } from './bullmq/scrape-queue.service';
import { NotificationService } from './services/notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { formatDuration } from './utils/time';

@ApiTags('Scraping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('scraper')
export class ScraperController {
  private readonly logger = new Logger(ScraperController.name);

  constructor(
    private readonly scheduler: ScraperSchedulerService,
    private readonly registry: ScraperRegistryService,
    private readonly queueService: ScrapeQueueService,
    private readonly notification: NotificationService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get comprehensive scraper system status and monitoring info' })
  async getStatus() {
    const entries = this.registry.getAll();
    const active = this.registry.getActive();
    const queueMetrics = await this.queueService.getMetrics();
    const schedulerMetrics = await this.scheduler.getSchedulerMetrics();
    const detectionResults = this.registry.getDetectedMethods();

    return {
      system: {
        totalBanks: this.registry.getCount(),
        activeBanks: this.registry.getActiveCount(),
        registeredBanks: entries.length,
        autoDetectedBanks: detectionResults,
      },
      scheduler: schedulerMetrics,
      queue: queueMetrics,
      runHistory: this.scheduler.getRunHistory(30),
      banks: entries.map((e) => {
        const detected = detectionResults.find((d) => d.slug === e.slug);
        return {
          slug: e.slug,
          name: e.metadata.name,
          website: e.metadata.website,
          method: detected?.method ?? e.metadata.method,
          detectionConfidence: detected?.confidence ?? null,
          isActive: e.metadata.isActive,
          isEnabled: this.registry.isEnabled(e.slug),
          supportedCurrencies: e.metadata.supportedCurrencies,
        };
      }),
    };
  }

  @Post('trigger')
  @ApiOperation({ summary: 'Manually trigger a full scrape run' })
  async triggerScrape() {
    this.logger.log('Manual scrape triggered via admin');
    const results = await this.scheduler.triggerManualRun();

    return {
      message: 'Scrape run triggered',
      timestamp: new Date().toISOString(),
      summary: {
        total: results.length,
        success: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        totalDuration: results.reduce((sum, r) => sum + r.durationMs, 0),
      },
      results: results.map((r) => ({
        bank: r.bankName,
        success: r.success,
        ratesCount: r.ratesCount,
        errors: r.errors,
        warnings: r.warnings,
        duration: formatDuration(r.durationMs),
      })),
    };
  }

  @Post('trigger/:slug')
  @ApiOperation({ summary: 'Manually trigger scrape for a single bank' })
  async triggerSingleScrape(@Param('slug') slug: string) {
    const entry = this.registry.getEntry(slug.toUpperCase());
    if (!entry) {
      return { success: false, error: `No scraper registered for ${slug}` };
    }

    this.logger.log(`Manual scrape triggered for ${entry.metadata.name}`);
    await this.queueService.addJob(slug.toUpperCase());

    return {
      message: `Scrape triggered for ${entry.metadata.name}`,
      bank: entry.metadata.name,
      slug: entry.slug,
    };
  }

  @Get('banks')
  @ApiOperation({ summary: 'List all registered scraper banks with detection info' })
  getBanks() {
    const detectionResults = this.registry.getDetectedMethods();
    const entries = this.registry.getAll();

    return entries.map((e) => {
      const detected = detectionResults.find((d) => d.slug === e.slug);
      return {
        slug: e.slug,
        name: e.metadata.name,
        website: e.metadata.website,
        method: detected?.method ?? e.metadata.method,
        detectionConfidence: detected?.confidence ?? null,
        isActive: e.metadata.isActive,
        isEnabled: this.registry.isEnabled(e.slug),
        supportedCurrencies: e.metadata.supportedCurrencies,
      };
    });
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get BullMQ queue metrics for monitoring dashboard' })
  async getMetrics() {
    const queueMetrics = await this.queueService.getMetrics();
    const schedulerMetrics = await this.scheduler.getSchedulerMetrics();

    return {
      queue: {
        ...queueMetrics,
        jobCompletionRate: queueMetrics.completed + queueMetrics.failed > 0
          ? Math.round((queueMetrics.completed / (queueMetrics.completed + queueMetrics.failed)) * 100)
          : 100,
      },
      scheduler: {
        totalRuns: schedulerMetrics.totalRuns,
        totalSuccesses: schedulerMetrics.totalSuccesses,
        totalFailures: schedulerMetrics.totalFailures,
        successRate: schedulerMetrics.successRate,
        averageDurationMs: schedulerMetrics.averageDurationMs,
        isRunning: schedulerMetrics.isRunning,
        lastRunStart: schedulerMetrics.lastRunStart,
        lastRunEnd: schedulerMetrics.lastRunEnd,
        nextScheduledRun: schedulerMetrics.nextScheduledRun,
      },
      runHistory: this.scheduler.getRunHistory(30),
    };
  }

  @Get('queue')
  @ApiOperation({ summary: 'Get BullMQ queue details' })
  async getQueue() {
    return this.queueService.getMetrics();
  }

  @Post('notify/test')
  @ApiOperation({ summary: 'Send a test notification' })
  async testNotification() {
    await this.notification.sendFailureAlert('Test', 'This is a test notification from EthioBanksHub scraper', 0, 100);
    return { message: 'Test notification sent (if configured)' };
  }
}
