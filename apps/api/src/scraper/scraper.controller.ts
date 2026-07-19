import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ScraperSchedulerService } from './jobs/scheduler.service';
import { ScraperRegistryService } from './registry/scraper-registry.service';
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
  constructor(
    private readonly scheduler: ScraperSchedulerService,
    private readonly registry: ScraperRegistryService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get scraper system status and monitoring info' })
  getStatus() {
    const entries = this.registry.getAll();
    const active = this.registry.getActive();

    return {
      system: {
        totalBanks: this.registry.getCount(),
        activeBanks: this.registry.getActiveCount(),
        registeredBanks: entries.length,
      },
      scheduler: {
        isRunning: this.scheduler.isRunningNow,
        totalRuns: this.scheduler.totalRuns,
        totalSuccesses: this.scheduler.totalSuccesses,
        totalFailures: this.scheduler.totalFailures,
        lastRunStart: this.scheduler.lastRunStart?.toISOString() ?? null,
        lastRunEnd: this.scheduler.lastRunEnd?.toISOString() ?? null,
        nextScheduledRun: this.scheduler.nextScheduledRun.toISOString(),
        nextScheduledRunEAT: this.scheduler.nextScheduledRun.toLocaleString('en-ET', {
          timeZone: 'Africa/Addis_Ababa',
        }),
      },
      lastResults: this.scheduler.lastResults.map((r) => ({
        bank: r.bankName,
        success: r.success,
        ratesCount: r.ratesCount,
        errors: r.errors,
        warnings: r.warnings,
        duration: formatDuration(r.durationMs),
      })),
      banks: entries.map((e) => ({
        slug: e.slug,
        name: e.metadata.name,
        website: e.metadata.website,
        method: e.metadata.method,
        isActive: e.metadata.isActive,
        isEnabled: this.registry.isEnabled(e.slug),
        supportedCurrencies: e.metadata.supportedCurrencies,
      })),
    };
  }

  @Post('trigger')
  @ApiOperation({ summary: 'Manually trigger a full scrape run' })
  async triggerScrape() {
    await this.scheduler.triggerManualRun();
    return {
      message: 'Scrape run triggered',
      results: this.scheduler.lastResults.map((r) => ({
        bank: r.bankName,
        success: r.success,
        ratesCount: r.ratesCount,
        duration: formatDuration(r.durationMs),
      })),
    };
  }

  @Get('banks')
  @ApiOperation({ summary: 'List all registered scraper banks' })
  getBanks() {
    return this.registry.getAll().map((e) => ({
      slug: e.slug,
      name: e.metadata.name,
      website: e.metadata.website,
      method: e.metadata.method,
      isActive: e.metadata.isActive,
      isEnabled: this.registry.isEnabled(e.slug),
      supportedCurrencies: e.metadata.supportedCurrencies,
    }));
  }
}
