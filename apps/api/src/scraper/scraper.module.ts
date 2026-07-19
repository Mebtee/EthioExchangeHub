import { Module } from '@nestjs/common';
import { ScraperController } from './scraper.controller';
import { ScraperRegistryService } from './registry/scraper-registry.service';
import { ScraperSchedulerService } from './jobs/scheduler.service';
import { ScrapeExecutorService } from './services/scrape-executor.service';
import { ScraperFactory } from './services/scraper-factory.service';
import { ScrapeQueueService } from './bullmq/scrape-queue.service';
import { ScrapeWorker } from './workers/scrape.worker';
import { HttpClientService } from './utils/http-client';
import { HtmlParserService } from './parsers/html-parser.service';
import { PlaywrightParserService } from './parsers/playwright-parser.service';
import { RateValidatorService } from './validators/rate-validator.service';
import { NotificationService } from './services/notification.service';
import { CacheInvalidationService } from './services/cache-invalidation.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ScraperController],
  providers: [
    // Registry
    ScraperRegistryService,
    // Factory (replaces hardcoded switch statements)
    ScraperFactory,
    // Services
    ScrapeExecutorService,
    ScraperSchedulerService,
    NotificationService,
    CacheInvalidationService,
    // BullMQ Queue
    ScrapeQueueService,
    // Workers
    ScrapeWorker,
    // Utilities
    HttpClientService,
    HtmlParserService,
    PlaywrightParserService,
    // Validators
    RateValidatorService,
  ],
  exports: [
    ScraperSchedulerService,
    ScrapeExecutorService,
    ScraperRegistryService,
    ScrapeQueueService,
  ],
})
export class ScraperModule {}
