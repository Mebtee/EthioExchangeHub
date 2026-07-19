import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

@Injectable()
export class HtmlArchiveService {
  private readonly logger = new Logger(HtmlArchiveService.name);
  private readonly RETENTION_DAYS = 90;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Archive raw HTML with gzip compression.
   * Sets retention to 90 days from now.
   */
  async archiveHtml(
    rawScrapeDataId: string,
    bankId: string,
    sourceUrl: string,
    rawHtml: string,
  ): Promise<{ id: string; compressedSize: number; originalSize: number }> {
    const originalSize = Buffer.byteLength(rawHtml, 'utf-8');
    const compressed = await gzip(rawHtml, { level: 9 });
    const compressedSize = compressed.length;

    const retentionUntil = new Date();
    retentionUntil.setDate(retentionUntil.getDate() + this.RETENTION_DAYS);

    const archive = await this.prisma.htmlArchive.create({
      data: {
        rawScrapeDataId,
        bankId,
        sourceUrl,
        compressedHtml: compressed,
        originalSize,
        compressedSize,
        compressionAlgo: 'gzip',
        retentionUntil,
      },
    });

    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    this.logger.log(`HTML archived: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${ratio}% saved)`);

    return { id: archive.id, compressedSize, originalSize };
  }

  /**
   * Retrieve and decompress archived HTML.
   */
  async getHtml(archiveId: string): Promise<string | null> {
    const archive = await this.prisma.htmlArchive.findUnique({ where: { id: archiveId } });
    if (!archive) return null;

    try {
      const decompressed = await gunzip(archive.compressedHtml);
      return decompressed.toString('utf-8');
    } catch (error) {
      this.logger.error(`Failed to decompress HTML archive ${archiveId}: ${error}`);
      return null;
    }
  }

  /**
   * Get archived HTML as a download buffer.
   */
  async getDownloadBuffer(archiveId: string): Promise<{ buffer: Buffer; filename: string; mimeType: string } | null> {
    const archive = await this.prisma.htmlArchive.findUnique({ where: { id: archiveId } });
    if (!archive) return null;

    return {
      buffer: archive.compressedHtml,
      filename: `html-archive-${archiveId.slice(0, 8)}.html.gz`,
      mimeType: 'application/gzip',
    };
  }

  /**
   * List archives for a bank with pagination.
   */
  async listArchives(bankSlug?: string, page = 1, limit = 20) {
    const where: any = {};
    if (bankSlug) {
      const bank = await this.prisma.bank.findUnique({ where: { code: bankSlug } });
      if (bank) where.bankId = bank.id;
    }

    const [archives, total] = await Promise.all([
      this.prisma.htmlArchive.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
        select: {
          id: true,
          bankId: true,
          sourceUrl: true,
          originalSize: true,
          compressedSize: true,
          compressionAlgo: true,
          retentionUntil: true,
          createdAt: true,
        },
      }),
      this.prisma.htmlArchive.count({ where }),
    ]);

    return { data: archives, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /**
   * Clean up expired archives (beyond 90-day retention).
   */
  async cleanupExpiredArchives(): Promise<number> {
    const result = await this.prisma.htmlArchive.deleteMany({
      where: { retentionUntil: { lt: new Date() } },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired HTML archives`);
    }

    return result.count;
  }
}
