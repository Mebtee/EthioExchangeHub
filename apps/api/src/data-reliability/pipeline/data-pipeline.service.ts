import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { RawScrapedRate } from '../../scraper/interfaces/bank-scraper.interface';
import type { ScrapeResult } from '../../scraper/interfaces/bank-scraper.interface';
import { ValidationEngineService } from '../validation/validation-engine.service';
import { ConfidenceScorerService } from '../confidence/confidence-scorer.service';
import { AnomalyDetectionService } from '../anomaly/anomaly-detection.service';
import { ApprovalEngineService } from '../approval/approval-engine.service';
import { HtmlArchiveService } from '../html/html-archive.service';
import { HtmlChangeDetectionService } from '../html/html-change-detection.service';
import { ScreenshotService } from '../screenshot/screenshot.service';
import { AuditService } from '../audit/audit.service';
import { ProvenanceService } from '../audit/provenance.service';
import { ScraperHealthService } from '../health/scraper-health.service';
import { ReliabilityNotificationService } from '../notifications/reliability-notification.service';
import type { DataPipelineResult } from '../interfaces/data-reliability.interface';

@Injectable()
export class DataPipelineService {
  private readonly logger = new Logger(DataPipelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly validationEngine: ValidationEngineService,
    private readonly confidenceScorer: ConfidenceScorerService,
    private readonly anomalyDetection: AnomalyDetectionService,
    private readonly approvalEngine: ApprovalEngineService,
    private readonly htmlArchive: HtmlArchiveService,
    private readonly htmlChangeDetection: HtmlChangeDetectionService,
    private readonly screenshot: ScreenshotService,
    private readonly audit: AuditService,
    private readonly provenance: ProvenanceService,
    private readonly health: ScraperHealthService,
    private readonly notifications: ReliabilityNotificationService,
  ) {}

  /**
   * Process a scrape result through the full two-stage pipeline:
   *   Raw Scrape → Validation → Confidence Scoring → Anomaly Detection → Approval → Production
   *
   * NEVER writes to exchange_rates without going through the full pipeline.
   */
  async processScrapeResult(
    result: ScrapeResult,
    scraperHistory: { recentSuccesses: number; recentFailures: number },
  ): Promise<DataPipelineResult> {
    const { bankId, bankSlug, sourceUrl, rates, rawHtml, durationMs, scrapeMethod } = result;
    const errors: string[] = [];

    // ═══ Stage 1: Store raw scrape data (immutable) ═══
    this.logger.log(`Stage 1: Storing raw scrape data for ${bankSlug}`);
    const rawScrapeData = await this.prisma.rawScrapeData.create({
      data: {
        bankId,
        sourceUrl,
        rawHtml: rawHtml ?? null,
        extractedValues: rates.map((r) => ({
          currencyFrom: r.currencyFrom ?? 'ETB',
          currencyTo: r.currencyTo,
          buyRate: r.buyRate,
          sellRate: r.sellRate,
        })),
        scraperVersion: '1.0.0',
        parserVersion: '1.0.0',
        responseTimeMs: durationMs,
        scrapeTimestamp: new Date(),
        metadata: { scrapeMethod, bankSlug },
      },
    });

    await this.audit.logScrape(bankSlug, bankId, 'SCRAPED', rates.length);

    // ═══ Stage 2: Validation Engine ═══
    this.logger.log(`Stage 2: Validating ${rates.length} rates for ${bankSlug}`);
    const validation = await this.validationEngine.validate(rates, bankId, bankSlug);

    // Store validation results
    const validationRun = await this.prisma.validationRun.create({
      data: {
        rawScrapeDataId: rawScrapeData.id,
        bankId,
        totalRules: validation.results.length,
        passedCount: validation.passedCount,
        warningCount: validation.warningCount,
        failCount: validation.failCount,
        overallStatus: validation.overallStatus,
        durationMs: Date.now(),
        results: {
          create: validation.results.map((r) => ({
            ruleId: r.ruleId,
            ruleName: r.ruleName,
            status: r.status as any,
            currencyTo: r.currencyTo ?? null,
            message: r.message,
            details: (r.details ?? null) as any,
            rule: { connect: { id: r.ruleId } },
          })),
        },
      },
    });

    await this.audit.logValidation(rawScrapeData.id, validation.overallStatus, validation.passedCount, validation.failCount);

    // ═══ Stage 3: HTML Archive & Change Detection ═══
    this.logger.log(`Stage 3: Archiving HTML and detecting changes for ${bankSlug}`);
    let htmlArchiveId: string | undefined;
    let htmlChanged = false;

    if (rawHtml) {
      const archive = await this.htmlArchive.archiveHtml(rawScrapeData.id, bankId, sourceUrl, rawHtml);
      htmlArchiveId = archive.id;

      const changeResult = await this.htmlChangeDetection.detectChanges(bankId, rawHtml);
      htmlChanged = changeResult.hasChanges;

      if (changeResult.shouldDisableAutoPublish) {
        errors.push('Auto-publishing disabled due to significant HTML changes');
        this.logger.warn(`HTML structure changed significantly for ${bankSlug} — disabling auto-publish`);
      }
    }

    // ═══ Stage 4: Screenshot Capture ═══
    this.logger.log(`Stage 4: Capturing screenshots for ${bankSlug}`);
    const screenshots = await this.screenshot.captureScreenshots(
      rawScrapeData.id,
      bankId,
      sourceUrl,
      rawHtml ?? '<html><body><p>No content</p></body></html>',
    );

    // ═══ Stage 5: Confidence Scoring ═══
    this.logger.log(`Stage 5: Computing confidence score for ${bankSlug}`);
    const confidenceResult = await this.confidenceScorer.computeScore(
      rates,
      bankSlug,
      validation.results,
      !!screenshots.cropped,
      htmlChanged,
      scraperHistory,
    );

    const confidenceScore = await this.prisma.confidenceScore.create({
      data: {
        rawScrapeDataId: rawScrapeData.id,
        bankId,
        currencyTo: rates[0]?.currencyTo ?? 'USD',
        score: confidenceResult.score,
        breakdown: confidenceResult.breakdown as any,
      },
    });

    // ═══ Stage 6: Anomaly Detection ═══
    this.logger.log(`Stage 6: Detecting anomalies for ${bankSlug}`);
    const previousRates = await this.getPreviousRates(bankSlug);
    const anomalies = await this.anomalyDetection.detectAnomalies(
      rates,
      bankSlug,
      result.bankSlug,
      validation.results,
      htmlChanged,
      200,
      rawHtml,
      previousRates,
    );

    // Store high-severity anomalies
    for (const anomaly of anomalies) {
      if (anomaly.severity === 'HIGH' || anomaly.severity === 'CRITICAL') {
        await this.prisma.anomalyIncident.create({
          data: {
            type: anomaly.type,
            severity: anomaly.severity as any,
            status: 'OPEN',
            bankId,
            rawScrapeDataId: rawScrapeData.id,
            description: anomaly.description,
            details: (anomaly.details ?? null) as any,
          },
        });

        // Send notifications for critical anomalies
        await this.notifications.notify({
          type: anomaly.type === 'SPIKE' ? 'SCRAPE_FAILURE'
            : anomaly.type === 'PARSER_FAILURE' ? 'PARSER_FAILURE'
            : anomaly.type === 'HTML_CHANGE' ? 'HTML_CHANGED'
            : anomaly.type === 'MISSING_CURRENCY' ? 'MISSING_CURRENCIES'
            : 'VALIDATION_FAILURE',
          severity: anomaly.severity,
          bankName: bankSlug,
          message: anomaly.description,
          details: anomaly.details,
        });
      }
    }

    // ═══ Stage 7: Approval Engine ═══
    this.logger.log(`Stage 7: Processing approval for ${bankSlug}`);
    const approvalRecord = await this.approvalEngine.createPending(
      rawScrapeData.id,
      bankId,
      confidenceResult.score,
    );

    // Auto-validate if confidence is high enough and no critical anomalies
    const hasCriticalAnomalies = anomalies.some((a) => a.severity === 'CRITICAL');
    const hasHtmlStructureIssue = htmlChanged && errors.some((e) => e.includes('Auto-publishing'));

    if (confidenceResult.score >= 75 && !hasCriticalAnomalies && !hasHtmlStructureIssue) {
      await this.approvalEngine.validate(approvalRecord.id);
      await this.audit.logApproval(approvalRecord.id, 'system', 'PENDING', 'VALIDATED', 'Auto-validated (score >= 75)');
    } else {
      await this.notifications.notify({
        type: 'LOW_CONFIDENCE',
        severity: 'MEDIUM',
        bankName: bankSlug,
        message: `Confidence score ${confidenceResult.score}/100 requires manual review.`,
        details: { score: confidenceResult.score, anomalies: anomalies.filter((a) => a.severity !== 'LOW') },
      });
    }

    // ═══ Stage 8: Promote to Production (if approved) ═══
    let exchangeRateId: string | null = null;
    const currentStatus = await this.prisma.approvalRecord.findUnique({ where: { id: approvalRecord.id } });

    if (currentStatus && this.approvalEngine.isAllowedInProduction(currentStatus.status as any)) {
      this.logger.log(`Stage 8: Promoting ${rates.length} rates to production for ${bankSlug}`);

      // Only promote records that are APPROVED or VALIDATED
      const now = new Date();
      now.setHours(10, 0, 0, 0);

      for (const rate of rates) {
        try {
          const rateRecord = await this.prisma.exchangeRate.upsert({
            where: {
              bankId_currencyFrom_currencyTo_effectiveDate: {
                bankId,
                currencyFrom: rate.currencyFrom ?? 'ETB',
                currencyTo: rate.currencyTo,
                effectiveDate: now,
              },
            },
            update: {
              buyRate: rate.buyRate,
              sellRate: rate.sellRate,
              midRate: Math.round(((rate.buyRate + rate.sellRate) / 2) * 10000) / 10000,
              source: 'scraped',
            },
            create: {
              bankId,
              currencyFrom: rate.currencyFrom ?? 'ETB',
              currencyTo: rate.currencyTo,
              buyRate: rate.buyRate,
              sellRate: rate.sellRate,
              midRate: Math.round(((rate.buyRate + rate.sellRate) / 2) * 10000) / 10000,
              source: 'scraped',
              effectiveDate: now,
            },
          });

          exchangeRateId = rateRecord.id;

          // Record provenance
          await this.provenance.record({
            exchangeRateId: rateRecord.id,
            rawScrapeDataId: rawScrapeData.id,
            bankId,
            sourceUrl,
            parserVersion: '1.0.0',
            htmlArchiveId,
            screenshotId: screenshots.cropped?.id ?? screenshots.fullPage?.id ?? undefined,
            validationRunId: validationRun.id,
            approvalId: approvalRecord.id,
          });
        } catch (error) {
          this.logger.error(`Failed to promote rate ${rate.currencyTo}: ${error}`);
        }
      }
    } else {
      this.logger.log(`Stage 8: Skipped promotion for ${bankSlug} — status: ${currentStatus?.status}`);
    }

    // ═══ Stage 9: Update Health Snapshot ═══
    await this.health.createSnapshot();

    return {
      rawScrapeDataId: rawScrapeData.id,
      validationRunId: validationRun.id,
      confidenceScoreId: confidenceScore.id,
      approvalId: approvalRecord.id,
      exchangeRateId,
      anomalies,
      overallStatus: validation.overallStatus === 'FAIL' ? 'FAILED' : anomalies.some((a) => a.severity === 'CRITICAL') ? 'PARTIAL' : 'SUCCESS',
      errors,
    };
  }

  /**
   * Auto-approve threshold check — called by scheduler at 09:00 EAT.
   */
  async autoApproveHighConfidenceRecords(): Promise<number> {
    const pending = await this.prisma.approvalRecord.findMany({
      where: {
        status: 'VALIDATED',
        confidenceScore: { gte: 85 },
      },
    });

    let approvedCount = 0;
    for (const record of pending) {
      await this.approvalEngine.approve(record.id, 'system', 'Auto-approved (confidence >= 85)');
      approvedCount++;
    }

    if (approvedCount > 0) {
      this.logger.log(`Auto-approved ${approvedCount} high-confidence records`);
    }

    // Check for banks with no data today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const banks = await this.prisma.bank.findMany({ where: { isActive: true } });
    const banksWithNoData: string[] = [];

    for (const bank of banks) {
      const hasData = await this.prisma.rawScrapeData.findFirst({
        where: { bankId: bank.id, scrapeTimestamp: { gte: today } },
      });
      if (!hasData) banksWithNoData.push(bank.name);
    }

    if (banksWithNoData.length > 0) {
      await this.notifications.notifyNoDataBy0900(banksWithNoData);
    }

    return approvedCount;
  }

  private async getPreviousRates(bankSlug: string): Promise<RawScrapedRate[]> {
    try {
      const rates = await this.prisma.exchangeRate.findMany({
        where: { bank: { code: bankSlug } },
        orderBy: { effectiveDate: 'desc' },
        distinct: ['currencyTo'],
        take: 10,
      });

      return rates.map((r) => ({
        currencyFrom: r.currencyFrom as any,
        currencyTo: r.currencyTo as any,
        buyRate: Number(r.buyRate),
        sellRate: Number(r.sellRate),
      }));
    } catch {
      return [];
    }
  }
}
