import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ApprovalStatusType } from '../interfaces/data-reliability.interface';

@Injectable()
export class ApprovalEngineService {
  private readonly logger = new Logger(ApprovalEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an approval record for newly scraped data (status: PENDING).
   */
  async createPending(
    rawScrapeDataId: string,
    bankId: string,
    confidenceScore: number,
  ): Promise<{ id: string; status: ApprovalStatusType }> {
    const record = await this.prisma.approvalRecord.create({
      data: {
        rawScrapeDataId,
        bankId,
        status: 'PENDING',
        confidenceScore,
        version: 1,
      },
    });

    this.logger.log(`Approval record created: ${record.id} (PENDING, score: ${confidenceScore})`);
    return { id: record.id, status: record.status as ApprovalStatusType };
  }

  /**
   * Validate a record (moves from PENDING to VALIDATED).
   * This is automatic when all checks pass.
   */
  async validate(id: string): Promise<ApprovalStatusType> {
    const record = await this.prisma.approvalRecord.update({
      where: { id },
      data: { status: 'VALIDATED' },
    });

    this.logger.log(`Approval record ${id} → VALIDATED`);
    return record.status as ApprovalStatusType;
  }

  /**
   * Approve a record (requires operator). Only VALIDATED or PENDING records can be approved.
   */
  async approve(id: string, reviewerId: string, notes?: string): Promise<ApprovalStatusType> {
    const record = await this.prisma.approvalRecord.findUnique({ where: { id } });
    if (!record) throw new Error(`Approval record ${id} not found`);
    if (record.status === 'REJECTED') throw new Error(`Cannot approve a rejected record (${id})`);

    const updated = await this.prisma.approvalRecord.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        notes: notes ?? null,
      },
    });

    this.logger.log(`Approval record ${id} → APPROVED by ${reviewerId}`);
    return updated.status as ApprovalStatusType;
  }

  /**
   * Reject a record. Only open records can be rejected.
   */
  async reject(id: string, reviewerId: string, reason: string): Promise<ApprovalStatusType> {
    const record = await this.prisma.approvalRecord.findUnique({ where: { id } });
    if (!record) throw new Error(`Approval record ${id} not found`);
    if (record.status === 'APPROVED') {
      throw new Error(`Cannot reject an already approved record (${id})`);
    }

    const updated = await this.prisma.approvalRecord.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
    });

    this.logger.log(`Approval record ${id} → REJECTED by ${reviewerId}: ${reason}`);
    return updated.status as ApprovalStatusType;
  }

  /**
   * Mark as ESTIMATED (when data is interpolated from other sources).
   */
  async markAsEstimated(id: string, notes?: string): Promise<ApprovalStatusType> {
    const updated = await this.prisma.approvalRecord.update({
      where: { id },
      data: {
        status: 'ESTIMATED',
        notes: notes ?? 'Estimated from available data',
      },
    });

    this.logger.log(`Approval record ${id} → ESTIMATED`);
    return updated.status as ApprovalStatusType;
  }

  /**
   * Check if a record is allowed in production.
   */
  isAllowedInProduction(status: ApprovalStatusType): boolean {
    return status === 'APPROVED' || status === 'VALIDATED';
  }

  /**
   * Get records pending review.
   */
  async getPendingReviews(page = 1, limit = 20) {
    const [records, total] = await Promise.all([
      this.prisma.approvalRecord.findMany({
        where: { status: { in: ['PENDING', 'VALIDATED'] } },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.approvalRecord.count({
        where: { status: { in: ['PENDING', 'VALIDATED'] } },
      }),
    ]);

    return { data: records, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}
