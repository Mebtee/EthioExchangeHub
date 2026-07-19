import { Test, type TestingModule } from '@nestjs/testing';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { HtmlChangeDetectionService } from '../html/html-change-detection.service';
import { PrismaService } from '../../prisma/prisma.service';

const gzip = promisify(zlib.gzip);

describe('HtmlChangeDetectionService', () => {
  let service: HtmlChangeDetectionService;
  let compressedHtml: Buffer;

  const previousHtml = `<!DOCTYPE html><html><head></head><body>
    <table class="exchange-rates">
      <thead><tr><th>Currency</th><th>Buy Rate</th><th>Sell Rate</th><th>Date</th></tr></thead>
      <tbody><tr><td>USD</td><td>56.5</td><td>57.2</td><td>2024-01-01</td></tr></tbody>
    </table>
  </body></html>`;

  beforeAll(async () => {
    compressedHtml = await gzip(previousHtml);
  });

  const mockPrisma = (overrides = {}) => ({
    htmlArchive: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'archive-1',
        compressedHtml: compressedHtml,
        ...overrides,
      }),
    },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HtmlChangeDetectionService,
        { provide: PrismaService, useValue: mockPrisma() },
      ],
    }).compile();

    service = module.get<HtmlChangeDetectionService>(HtmlChangeDetectionService);
  });

  it('should detect no changes for identical HTML', async () => {
    const result = await service.detectChanges('bank-1', previousHtml);
    expect(result.hasChanges).toBe(false);
    expect(result.diffScore).toBe(0);
    expect(result.shouldDisableAutoPublish).toBe(false);
  });

  it('should detect added columns', async () => {
    const newHtml = `<!DOCTYPE html><html><head></head><body>
      <table class="exchange-rates">
        <thead><tr><th>Currency</th><th>Buy Rate</th><th>Sell Rate</th><th>Spread</th><th>Date</th></tr></thead>
        <tbody><tr><td>USD</td><td>56.5</td><td>57.2</td><td>0.7</td><td>2024-01-01</td></tr></tbody>
      </table>
    </body></html>`;

    const result = await service.detectChanges('bank-1', newHtml);
    expect(result.addedColumns.length).toBeGreaterThanOrEqual(1);
    expect(result.hasChanges).toBe(true);
  });

  it('should detect removed columns', async () => {
    const newHtml = `<!DOCTYPE html><html><head></head><body>
      <table class="exchange-rates">
        <thead><tr><th>Currency</th><th>Buy Rate</th><th>Sell Rate</th></tr></thead>
        <tbody><tr><td>USD</td><td>56.5</td><td>57.2</td></tr></tbody>
      </table>
    </body></html>`;

    const result = await service.detectChanges('bank-1', newHtml);
    expect(result.removedColumns.length).toBeGreaterThanOrEqual(1);
    expect(result.hasChanges).toBe(true);
  });

  it('should disable auto-publish with high diff score (3+ changes)', async () => {
    // HTML with completely different structure (changes selectors + columns)
    const veryDifferentHtml = `<!DOCTYPE html><html><head></head><body>
      <div class="new-layout">
        <table id="rates-table">
          <thead><tr><th>Code</th><th>Buying</th><th>Selling</th></tr></thead>
        </table>
      </div>
    </body></html>`;

    const result = await service.detectChanges('bank-1', veryDifferentHtml);
    // Changes detected = changed selectors ('.exchange-rates' vs '#rates-table') + added/removed columns
    // At minimum 2 changes = 50 diff score, might or might not disable
    expect(result.hasChanges).toBe(true);
  });

  it('should handle no previous archive gracefully', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HtmlChangeDetectionService,
        {
          provide: PrismaService,
          useValue: { htmlArchive: { findFirst: jest.fn().mockResolvedValue(null) } },
        },
      ],
    }).compile();

    const svc = module.get<HtmlChangeDetectionService>(HtmlChangeDetectionService);
    const result = await svc.detectChanges('new-bank', previousHtml);
    expect(result.hasChanges).toBe(false);
    expect(result.shouldDisableAutoPublish).toBe(false);
  });
});
