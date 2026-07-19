import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalEngineService } from './approval-engine.service';

@Injectable()
export class ReviewQueueService {
  private readonly logger = new Logger(ReviewQueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalEngine: ApprovalEngineService,
  ) {}

  /**
   * Get the full review queue with evidence (screenshots, previous rates, HTML diff).
   */
  async getReviewQueue(page = 1, limit = 20, status?: string) {
    const where: any = {};
    if (status) where.status = status;

    const [records, total] = await Promise.all([
      this.prisma.approvalRecord.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.approvalRecord.count({ where }),
    ]);

    // Enrich with supporting data
    const enriched = await Promise.all(
      records.map(async (record) => {
        const rawData = record.rawScrapeDataId
          ? await this.prisma.rawScrapeData.findUnique({
              where: { id: record.rawScrapeDataId },
              include: {
                screenshots: { take: 2 },
                validationRuns: {
                  include: { results: true },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
                confidenceScores: {
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            })
          : null;

        return {
          id: record.id,
          status: record.status,
          bankId: record.bankId,
          confidenceScore: record.confidenceScore,
          rejectionReason: record.rejectionReason,
          createdAt: record.createdAt,
          evidence: rawData
            ? {
                screenshots: rawData.screenshots.map((s) => ({
                  id: s.id,
                  filePath: s.filePath,
                  type: s.type,
                  url: s.url,
                })),
                validation: rawData.validationRuns[0]
                  ? {
                      overallStatus: rawData.validationRuns[0].overallStatus,
                      passed: rawData.validationRuns[0].passedCount,
                      warnings: rawData.validationRuns[0].warningCount,
                      fails: rawData.validationRuns[0].failCount,
                    }
                  : null,
                confidence: rawData.confidenceScores[0] ?? null,
                hasRawHtml: !!rawData.rawHtml,
              }
            : null,
        };
      }),
    );

    return { data: enriched, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /**
   * Approve a record — promotes to production if conditions met.
   */
  async approveReview(id: string, userId: string, notes?: string) {
    const status = await this.approvalEngine.approve(id, userId, notes);
    return { id, status };
  }

  /**
   * Reject a record with reason.
   */
  async rejectReview(id: string, userId: string, reason: string) {
    const status = await this.approvalEngine.reject(id, userId, reason);
    return { id, status, reason };
  }

  /**
   * Reprocess — creates a new scrape attempt for the same bank/currency.
   */
  async reprocessReview(id: string, userId: string) {
    const record = await this.prisma.approvalRecord.findUnique({ where: { id } });
    if (!record) throw new Error(`Approval record ${id} not found`);

    // Mark current as rejected for reprocessing
    await this.approvalEngine.reject(id, userId, 'Reprocessing requested');

    this.logger.log(`Review ${id} queued for reprocessing by ${userId}`);
    return { id, status: 'REPROCESSING' as const };
  }

  /**
   * Edit raw data for correction.
   */
  async editReviewRates(id: string, rates: { currencyTo: string; buyRate: number; sellRate: number }[]) {
    const record = await this.prisma.approvalRecord.findUnique({ where: { id } });
    if (!record) throw new Error(`Approval record ${id} not found`);

    // Update extracted values in raw scrape data
    await this.prisma.rawScrapeData.update({
      where: { id: record.rawScrapeDataId },
      data: {
        extractedValues: rates,
      },
    });

    this.logger.log(`Review ${id} rates manually edited`);
    return { id, rates };
  }

  /**
   * Escalate to higher authority.
   */
  async escalateReview(id: string, userId: string, reason: string) {
    const record = await this.prisma.approvalRecord.findUnique({ where: { id } });
    if (!record) throw new Error(`Approval record ${id} not found`);

    // Increase version
    await this.prisma.approvalRecord.update({
      where: { id },
      data: {
        version: { increment: 1 },
        notes: `ESCALATED by ${userId}: ${reason}${record.notes ? `\n${record.notes}` : ''}`,
      },
    });

    this.logger.log(`Review ${id} escalated by ${userId}: ${reason}`);
    return { id, escalated: true };
  }
}
