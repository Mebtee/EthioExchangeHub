import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReviewQueueService } from './approval/review-queue.service';
import { AuditService } from './audit/audit.service';
import { HtmlArchiveService } from './html/html-archive.service';
import { ScraperHealthService } from './health/scraper-health.service';
import { DataPipelineService } from './pipeline/data-pipeline.service';
import { PrismaService } from '../prisma/prisma.service';
import type { Request } from 'express';

@ApiTags('Admin — Data Reliability')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/data-reliability')
export class DataReliabilityAdminController {
  constructor(
    private readonly reviewQueue: ReviewQueueService,
    private readonly audit: AuditService,
    private readonly htmlArchive: HtmlArchiveService,
    private readonly health: ScraperHealthService,
    private readonly pipeline: DataPipelineService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Manual Review Queue ─────────────────────────────────────
  @Get('review-queue')
  @ApiOperation({ summary: 'Get review queue with evidence' })
  async getReviewQueue(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.reviewQueue.getReviewQueue(page, limit, status);
  }

  @Post('review-queue/:id/approve')
  @ApiOperation({ summary: 'Approve a review record' })
  async approveReview(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any)?.id ?? 'unknown';
    return this.reviewQueue.approveReview(id, userId);
  }

  @Post('review-queue/:id/reject')
  @ApiOperation({ summary: 'Reject a review record' })
  async rejectReview(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: Request,
  ) {
    const userId = (req.user as any)?.id ?? 'unknown';
    return this.reviewQueue.rejectReview(id, userId, reason);
  }

  @Post('review-queue/:id/reprocess')
  @ApiOperation({ summary: 'Reprocess a review record' })
  async reprocessReview(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any)?.id ?? 'unknown';
    return this.reviewQueue.reprocessReview(id, userId);
  }

  @Post('review-queue/:id/escalate')
  @ApiOperation({ summary: 'Escalate a review record' })
  async escalateReview(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: Request,
  ) {
    const userId = (req.user as any)?.id ?? 'unknown';
    return this.reviewQueue.escalateReview(id, userId, reason);
  }

  // ── Anomaly Incidents ───────────────────────────────────────
  @Get('anomalies')
  @ApiOperation({ summary: 'List anomaly incidents' })
  async getAnomalies(
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const where: any = {};
    if (status) where.status = status.toUpperCase();
    if (severity) where.severity = severity.toUpperCase();

    const [data, total] = await Promise.all([
      this.prisma.anomalyIncident.findMany({
        where,
        orderBy: [{ severity: 'desc' }, { detectedAt: 'desc' }],
        take: limit ?? 20,
        skip: ((page ?? 1) - 1) * (limit ?? 20),
      }),
      this.prisma.anomalyIncident.count({ where }),
    ]);

    return { data, meta: { page: page ?? 1, limit: limit ?? 20, total, totalPages: Math.ceil(total / (limit ?? 20)) } };
  }

  @Patch('anomalies/:id/resolve')
  @ApiOperation({ summary: 'Resolve an anomaly incident' })
  async resolveAnomaly(
    @Param('id') id: string,
    @Body('resolution') resolution: string,
    @Req() req: Request,
  ) {
    const userId = (req.user as any)?.id ?? 'unknown';

    await this.prisma.anomalyIncident.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: userId,
        resolution,
      },
    });

    await this.audit.log({
      userId,
      action: 'RESOLVE',
      entity: 'ANOMALY',
      entityId: id,
      newValue: { status: 'RESOLVED' },
      reason: resolution,
    });

    return { id, status: 'RESOLVED' };
  }

  // ── Audit Logs ──────────────────────────────────────────────
  @Get('audit-logs')
  @ApiOperation({ summary: 'Query immutable audit logs' })
  async getAuditLogs(
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.audit.query({ entity, entityId, action, page, limit });
  }

  // ── Validation Rules ────────────────────────────────────────
  @Get('validation-rules')
  @ApiOperation({ summary: 'List all validation rules' })
  async getValidationRules() {
    return this.prisma.validationRule.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  @Patch('validation-rules/:id')
  @ApiOperation({ summary: 'Update a validation rule configuration' })
  async updateValidationRule(
    @Param('id') id: string,
    @Body() data: { enabled?: boolean; config?: Record<string, unknown>; severity?: string; sortOrder?: number },
  ) {
    const oldRule = await this.prisma.validationRule.findUnique({ where: { id } });
    const updated = await this.prisma.validationRule.update({
      where: { id },
      data: {
        ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
        ...(data.config !== undefined ? { config: data.config } : {}),
        ...(data.severity !== undefined ? { severity: data.severity } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      },
    });

    await this.audit.log({
      action: 'UPDATE',
      entity: 'VALIDATION_RULE',
      entityId: id,
      oldValue: oldRule ? { enabled: oldRule.enabled, severity: oldRule.severity, config: oldRule.config } : undefined,
      newValue: data,
      reason: 'Validation rule configuration updated',
    });

    return updated;
  }

  // ── HTML Archives ───────────────────────────────────────────
  @Get('html-archives')
  @ApiOperation({ summary: 'List HTML archives with admin details' })
  async listArchives(
    @Query('bankSlug') bankSlug?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.htmlArchive.listArchives(bankSlug, page, limit);
  }

  @Get('html-archives/:id')
  @ApiOperation({ summary: 'Get HTML archive content for debugging' })
  async getArchiveContent(@Param('id') id: string) {
    const html = await this.htmlArchive.getHtml(id);
    const archive = await this.prisma.htmlArchive.findUnique({
      where: { id },
      select: { id: true, sourceUrl: true, originalSize: true, compressedSize: true, createdAt: true, retentionUntil: true },
    });

    if (!html) return { error: 'Archive not found or could not be decompressed' };

    return { ...archive, content: html };
  }

  // ── Health & Monitoring ─────────────────────────────────────
  @Get('health')
  @ApiOperation({ summary: 'Get full scraper health dashboard data' })
  async getHealthDashboard() {
    return this.health.getHealthSummary();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get reliability metrics for dashboard' })
  async getMetrics() {
    return this.health.getReliabilityMetrics();
  }

  // ── Auto-approve ────────────────────────────────────────────
  @Post('auto-approve')
  @ApiOperation({ summary: 'Run auto-approval for high-confidence pending records' })
  async autoApprove() {
    const count = await this.pipeline.autoApproveHighConfidenceRecords();
    return { message: `Auto-approved ${count} records` };
  }

  // ── Validation Runs ─────────────────────────────────────────
  @Get('validation-runs')
  @ApiOperation({ summary: 'List validation runs with results' })
  async getValidationRuns(
    @Query('bankId') bankId?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const where: any = {};
    if (bankId) where.bankId = bankId;
    if (status) where.overallStatus = status.toUpperCase();

    const [runs, total] = await Promise.all([
      this.prisma.validationRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit ?? 20,
        skip: ((page ?? 1) - 1) * (limit ?? 20),
        include: { _count: { select: { results: true } } },
      }),
      this.prisma.validationRun.count({ where }),
    ]);

    return { data: runs, meta: { page: page ?? 1, limit: limit ?? 20, total, totalPages: Math.ceil(total / (limit ?? 20)) } };
  }

  // ── Confidence Scores ──────────────────────────────────────
  @Get('confidence-scores')
  @ApiOperation({ summary: 'List confidence scores' })
  async getConfidenceScores(
    @Query('bankId') bankId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const where: any = {};
    if (bankId) where.bankId = bankId;

    const [scores, total] = await Promise.all([
      this.prisma.confidenceScore.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit ?? 20,
        skip: ((page ?? 1) - 1) * (limit ?? 20),
      }),
      this.prisma.confidenceScore.count({ where }),
    ]);

    return { data: scores, meta: { page: page ?? 1, limit: limit ?? 20, total, totalPages: Math.ceil(total / (limit ?? 20)) } };
  }

  // ── Raw Scrape Data ─────────────────────────────────────────
  @Get('raw-scrape-data')
  @ApiOperation({ summary: 'List raw scrape data (immutable, read-only)' })
  async getRawScrapeData(
    @Query('bankId') bankId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const where: any = {};
    if (bankId) where.bankId = bankId;

    const [data, total] = await Promise.all([
      this.prisma.rawScrapeData.findMany({
        where,
        orderBy: { scrapeTimestamp: 'desc' },
        take: limit ?? 20,
        skip: ((page ?? 1) - 1) * (limit ?? 20),
        select: {
          id: true,
          bankId: true,
          sourceUrl: true,
          scraperVersion: true,
          parserVersion: true,
          scrapeTimestamp: true,
          responseTimeMs: true,
          httpStatus: true,
          createdAt: true,
        },
      }),
      this.prisma.rawScrapeData.count({ where }),
    ]);

    return { data, meta: { page: page ?? 1, limit: limit ?? 20, total, totalPages: Math.ceil(total / (limit ?? 20)) } };
  }
}
