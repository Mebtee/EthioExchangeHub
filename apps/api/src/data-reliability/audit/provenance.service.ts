import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface ProvenanceData {
  exchangeRateId: string;
  rawScrapeDataId: string;
  bankId: string;
  sourceUrl: string;
  scraperId?: string;
  parserVersion?: string;
  htmlArchiveId?: string;
  screenshotId?: string;
  validationRunId?: string;
  approvalId?: string;
  operatorId?: string;
}

@Injectable()
export class ProvenanceService {
  private readonly logger = new Logger(ProvenanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a provenance record linking a production rate to all its source artifacts.
   */
  async record(data: ProvenanceData) {
    const provenance = await this.prisma.dataProvenance.create({
      data: {
        exchangeRateId: data.exchangeRateId,
        rawScrapeDataId: data.rawScrapeDataId,
        bankId: data.bankId,
        sourceUrl: data.sourceUrl,
        scraperId: data.scraperId ?? null,
        parserVersion: data.parserVersion ?? null,
        htmlArchiveId: data.htmlArchiveId ?? null,
        screenshotId: data.screenshotId ?? null,
        validationRunId: data.validationRunId ?? null,
        approvalId: data.approvalId ?? null,
        operatorId: data.operatorId ?? null,
      },
    });

    this.logger.log(`Provenance recorded for rate ${data.exchangeRateId}`);
    return provenance;
  }

  /**
   * Get full provenance for a given exchange rate.
   * Answers: Which bank? Which page? Which scraper? Which parser? Which HTML? Which screenshot?
   * Which validation rules? Which operator approved it?
   */
  async getProvenance(exchangeRateId: string) {
    const record = await this.prisma.dataProvenance.findUnique({
      where: { exchangeRateId },
    });

    if (!record) return null;

    // Enrich with full details
    const [rawScrape, screenshots, htmlArchive, validationRun, approval, exchangeRate] = await Promise.all([
      this.prisma.rawScrapeData.findUnique({
        where: { id: record.rawScrapeDataId },
      }),
      record.screenshotId
        ? this.prisma.screenshot.findUnique({ where: { id: record.screenshotId } })
        : null,
      record.htmlArchiveId
        ? this.prisma.htmlArchive.findUnique({ where: { id: record.htmlArchiveId } })
        : null,
      record.validationRunId
        ? this.prisma.validationRun.findUnique({
            where: { id: record.validationRunId },
            include: { results: { take: 50, orderBy: { createdAt: 'desc' } } },
          })
        : null,
      record.approvalId
        ? this.prisma.approvalRecord.findUnique({ where: { id: record.approvalId } })
        : null,
      this.prisma.exchangeRate.findUnique({
        where: { id: exchangeRateId },
        include: { bank: { select: { name: true, code: true, website: true } } },
      }),
    ]);

    return {
      rate: exchangeRate
        ? {
            id: exchangeRate.id,
            bank: exchangeRate.bank?.name,
            bankCode: exchangeRate.bank?.code,
            currencyFrom: exchangeRate.currencyFrom,
            currencyTo: exchangeRate.currencyTo,
            buyRate: Number(exchangeRate.buyRate),
            sellRate: Number(exchangeRate.sellRate),
            source: exchangeRate.source,
            effectiveDate: exchangeRate.effectiveDate,
          }
        : null,
      source: {
        url: record.sourceUrl,
        scraperId: record.scraperId,
        parserVersion: record.parserVersion,
        scrapedAt: rawScrape?.scrapeTimestamp,
        responseTimeMs: rawScrape?.responseTimeMs,
        httpStatus: rawScrape?.httpStatus,
      },
      evidence: {
        htmlArchived: !!htmlArchive,
        screenshotCaptured: !!screenshots,
        screenshotDetails: screenshots
          ? { type: screenshots.type, filePath: screenshots.filePath, fileSize: screenshots.fileSize }
          : null,
      },
      validation: validationRun
        ? {
            overallStatus: validationRun.overallStatus,
            passed: validationRun.passedCount,
            warnings: validationRun.warningCount,
            fails: validationRun.failCount,
            score: validationRun.score,
            rules: validationRun.results.map((r) => ({
              rule: r.ruleName,
              status: r.status,
              currency: r.currencyTo,
            })),
          }
        : null,
      approval: approval
        ? {
            status: approval.status,
            reviewedBy: approval.reviewedBy,
            reviewedAt: approval.reviewedAt,
            confidenceScore: approval.confidenceScore,
            version: approval.version,
          }
        : null,
    };
  }
}
