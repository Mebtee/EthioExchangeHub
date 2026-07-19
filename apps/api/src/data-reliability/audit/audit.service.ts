import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface AuditEntry {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an audit entry. Immutable — never deleted.
   */
  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId ?? null,
          oldValue: entry.oldValue ?? null,
          newValue: entry.newValue ?? null,
          reason: entry.reason ?? null,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
          metadata: entry.metadata ?? null,
        },
      });
    } catch (error) {
      // Log failure but don't crash — audit should never block the main flow
      this.logger.error(
        `Failed to write audit log: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  /**
   * Query audit logs with pagination.
   */
  async query(params: {
    entity?: string;
    entityId?: string;
    action?: string;
    userId?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
    const where: any = {};

    if (params.entity) where.entity = params.entity;
    if (params.entityId) where.entityId = params.entityId;
    if (params.action) where.action = params.action;
    if (params.userId) where.userId = params.userId;
    if (params.fromDate || params.toDate) {
      where.createdAt = {};
      if (params.fromDate) where.createdAt.gte = new Date(params.fromDate);
      if (params.toDate) where.createdAt.lte = new Date(params.toDate);
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data: logs, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /**
   * Log a scrape operation.
   */
  async logScrape(bankName: string, bankId: string, status: string, rateCount: number) {
    await this.log({
      action: 'SCRAPE',
      entity: 'RAW_SCRAPE',
      entityId: bankId,
      newValue: { bankName, status, rateCount },
      reason: `Scrape completed: ${status} with ${rateCount} rates`,
    });
  }

  /**
   * Log a validation run.
   */
  async logValidation(rawScrapeDataId: string, status: string, passed: number, failed: number) {
    await this.log({
      action: 'VALIDATE',
      entity: 'RAW_SCRAPE',
      entityId: rawScrapeDataId,
      newValue: { status, passed, failed },
      reason: `Validation: ${status} (${passed}P / ${failed}F)`,
    });
  }

  /**
   * Log an approval action.
   */
  async logApproval(approvalId: string, userId: string, oldStatus: string, newStatus: string, reason?: string) {
    await this.log({
      userId,
      action: 'APPROVE',
      entity: 'APPROVAL',
      entityId: approvalId,
      oldValue: { status: oldStatus },
      newValue: { status: newStatus },
      reason: reason ?? `Status changed: ${oldStatus} → ${newStatus}`,
    });
  }

  /**
   * Log a rejected record.
   */
  async logRejection(approvalId: string, userId: string, reason: string) {
    await this.log({
      userId,
      action: 'REJECT',
      entity: 'APPROVAL',
      entityId: approvalId,
      newValue: { status: 'REJECTED', reason },
      reason: `Rejected: ${reason}`,
    });
  }
}
