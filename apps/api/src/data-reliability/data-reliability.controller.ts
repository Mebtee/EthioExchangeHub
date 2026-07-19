import { Controller, Get, Param, Query, NotFoundException, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ProvenanceService } from './audit/provenance.service';
import { ScraperHealthService } from './health/scraper-health.service';
import { HtmlArchiveService } from './html/html-archive.service';

@ApiTags('Data Reliability')
@ApiBearerAuth()
@Controller('data-reliability')
export class DataReliabilityController {
  constructor(
    private readonly provenance: ProvenanceService,
    private readonly health: ScraperHealthService,
    private readonly htmlArchive: HtmlArchiveService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('provenance/:exchangeRateId')
  @ApiOperation({ summary: 'Get full data provenance for an exchange rate' })
  async getProvenance(@Param('exchangeRateId') exchangeRateId: string) {
    return this.provenance.getProvenance(exchangeRateId);
  }

  @Get('health')
  @ApiOperation({ summary: 'Get scraper health summary for all banks' })
  async getHealthSummary() {
    return this.health.getHealthSummary();
  }

  @Get('health/:bankId')
  @ApiOperation({ summary: 'Get health summary for a specific bank' })
  async getBankHealth(@Param('bankId') bankId: string) {
    const bank = await this.prisma.bank.findUnique({ where: { id: bankId } });
    if (!bank) throw new NotFoundException(`Bank ${bankId} not found`);
    return this.health.getBankHealth(bank.id, bank.name);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get overall reliability metrics' })
  async getMetrics() {
    return this.health.getReliabilityMetrics();
  }

  @Get('html-archives')
  @ApiOperation({ summary: 'List HTML archives' })
  async listArchives(
    @Query('bankSlug') bankSlug?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.htmlArchive.listArchives(bankSlug, page, limit);
  }

  @Get('html-archives/:id/download')
  @ApiOperation({ summary: 'Download archived HTML' })
  async downloadArchive(@Param('id') id: string, @Res() res: Response) {
    const download = await this.htmlArchive.getDownloadBuffer(id);
    if (!download) throw new NotFoundException('Archive not found');

    res.setHeader('Content-Type', download.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${download.filename}"`);
    res.setHeader('Content-Length', download.buffer.length);
    res.end(download.buffer);
  }
}
