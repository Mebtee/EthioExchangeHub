import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DataReliabilityController } from './data-reliability.controller';
import { DataReliabilityAdminController } from './data-reliability.admin.controller';
import { DataPipelineService } from './pipeline/data-pipeline.service';
import { ValidationEngineService } from './validation/validation-engine.service';
import { ConfidenceScorerService } from './confidence/confidence-scorer.service';
import { AnomalyDetectionService } from './anomaly/anomaly-detection.service';
import { ApprovalEngineService } from './approval/approval-engine.service';
import { ReviewQueueService } from './approval/review-queue.service';
import { HtmlArchiveService } from './html/html-archive.service';
import { HtmlChangeDetectionService } from './html/html-change-detection.service';
import { ScreenshotService } from './screenshot/screenshot.service';
import { AuditService } from './audit/audit.service';
import { ProvenanceService } from './audit/provenance.service';
import { ScraperHealthService } from './health/scraper-health.service';
import { ReliabilityNotificationService } from './notifications/reliability-notification.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    DataReliabilityController,
    DataReliabilityAdminController,
  ],
  providers: [
    // Pipeline
    DataPipelineService,
    // Validation
    ValidationEngineService,
    // Confidence
    ConfidenceScorerService,
    // Anomaly
    AnomalyDetectionService,
    // Approval
    ApprovalEngineService,
    ReviewQueueService,
    // HTML
    HtmlArchiveService,
    HtmlChangeDetectionService,
    // Screenshots
    ScreenshotService,
    // Audit
    AuditService,
    ProvenanceService,
    // Health
    ScraperHealthService,
    // Notifications
    ReliabilityNotificationService,
  ],
  exports: [
    DataPipelineService,
    AuditService,
    ScraperHealthService,
    ProvenanceService,
    ConfidenceScorerService,
    ReviewQueueService,
  ],
})
export class DataReliabilityModule {}
