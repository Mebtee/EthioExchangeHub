import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as zlib from 'zlib';
import { promisify } from 'util';
import type { HtmlChangeResult } from '../interfaces/data-reliability.interface';

const gunzip = promisify(zlib.gunzip);

@Injectable()
export class HtmlChangeDetectionService {
  private readonly logger = new Logger(HtmlChangeDetectionService.name);

  // CSS selectors commonly used for rate tables
  private readonly TABLE_SELECTORS = [
    'table',
    '.exchange-rates',
    '.rates-table',
    '#exchange-rates',
    '[class*="rate"]',
    '[class*="exchange"]',
    'table.table',
    'table tbody',
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compare current HTML against the previous archive for the same bank.
   * Returns a detailed diff result.
   */
  async detectChanges(
    bankId: string,
    currentHtml: string,
  ): Promise<HtmlChangeResult> {
    // Get the most recent HTML archive for this bank
    const previousArchive = await this.prisma.htmlArchive.findFirst({
      where: { bankId },
      orderBy: { createdAt: 'desc' },
    });

    if (!previousArchive) {
      return {
        hasChanges: false,
        addedColumns: [],
        removedColumns: [],
        movedTables: [],
        changedSelectors: [],
        diffScore: 0,
        shouldDisableAutoPublish: false,
      };
    }

    // Decompress previous HTML using static imports
    const previousHtml = await gunzip(previousArchive.compressedHtml).then(
      (buf) => buf.toString('utf-8'),
      () => null,
    );

    if (!previousHtml) {
      return {
        hasChanges: false,
        addedColumns: [],
        removedColumns: [],
        movedTables: [],
        changedSelectors: [],
        diffScore: 0,
        shouldDisableAutoPublish: false,
      };
    }

    // Detect structural changes
    const addedColumns = this.detectNewColumns(previousHtml, currentHtml);
    const removedColumns = this.detectMissingColumns(previousHtml, currentHtml);
    const movedTables = this.detectTableRepositioning(previousHtml, currentHtml);
    const changedSelectors = this.detectSelectorChanges(previousHtml, currentHtml);

    const totalChanges = addedColumns.length + removedColumns.length + movedTables.length + changedSelectors.length;
    const diffScore = Math.min(100, totalChanges * 25);

    const hasChanges = totalChanges > 0;
    const shouldDisableAutoPublish = diffScore > 50;

    if (hasChanges) {
      this.logger.warn(
        `HTML changes detected for bank ${bankId}: +${addedColumns.length} cols, -${removedColumns.length} cols, ${movedTables.length} tables moved, ${changedSelectors.length} selectors changed (score: ${diffScore})`,
      );
    }

    return {
      hasChanges,
      addedColumns,
      removedColumns,
      movedTables,
      changedSelectors,
      diffScore,
      shouldDisableAutoPublish,
    };
  }

  private detectNewColumns(previousHtml: string, currentHtml: string): string[] {
    const added: string[] = [];
    const prevHeaders = this.extractTableHeaders(previousHtml);
    const currHeaders = this.extractTableHeaders(currentHtml);

    for (const header of currHeaders) {
      if (!prevHeaders.includes(header)) {
        added.push(header);
      }
    }

    return added;
  }

  private detectMissingColumns(previousHtml: string, currentHtml: string): string[] {
    const removed: string[] = [];
    const prevHeaders = this.extractTableHeaders(previousHtml);
    const currHeaders = this.extractTableHeaders(currentHtml);

    for (const header of prevHeaders) {
      if (!currHeaders.includes(header)) {
        removed.push(header);
      }
    }

    return removed;
  }

  private detectTableRepositioning(previousHtml: string, currentHtml: string): string[] {
    const moved: string[] = [];

    for (const selector of this.TABLE_SELECTORS) {
      const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const prevCount = (previousHtml.match(new RegExp(escapedSelector, 'gi')) || []).length;
      const currCount = (currentHtml.match(new RegExp(escapedSelector, 'gi')) || []).length;

      if (prevCount !== currCount) {
        moved.push(selector);
      }
    }

    return moved;
  }

  private detectSelectorChanges(previousHtml: string, currentHtml: string): string[] {
    const changed: string[] = [];

    for (const selector of this.TABLE_SELECTORS) {
      const inPrev = previousHtml.includes(selector);
      const inCurr = currentHtml.includes(selector);

      if (inPrev !== inCurr) {
        changed.push(selector);
      }
    }

    return changed;
  }

  private extractTableHeaders(html: string): string[] {
    const headers: string[] = [];
    // Match <th> and <thead><tr><td> patterns
    const thRegex = /<th[^>]*>([^<]+)<\/th>/gi;
    const tdInHeaderRegex = /<thead[\s\S]*?<\/thead>/gi;

    const theadMatch = tdInHeaderRegex.exec(html);
    const searchHtml = theadMatch?.[0] ?? html;

    let match;
    while ((match = thRegex.exec(searchHtml)) !== null) {
      headers.push(match[1]!.trim());
    }

    return headers;
  }
}
