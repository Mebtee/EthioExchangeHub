import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

interface ScreenshotCapture {
  rawScrapeDataId: string;
  bankId: string;
  url: string;
  type: 'FULL_PAGE' | 'CROPPED';
  filePath: string;
  fileSize: number;
  width: number;
  height: number;
}

@Injectable()
export class ScreenshotService {
  private readonly logger = new Logger(ScreenshotService.name);
  private readonly r2Bucket: string;
  private readonly r2Endpoint: string;
  private readonly r2AccessKey: string;
  private readonly r2SecretKey: string;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.r2Bucket = configService.get<string>('R2_BUCKET', 'ethiobankshub-screenshots');
    this.r2Endpoint = configService.get<string>('R2_ENDPOINT', '');
    this.r2AccessKey = configService.get<string>('R2_ACCESS_KEY_ID', '');
    this.r2SecretKey = configService.get<string>('R2_SECRET_ACCESS_KEY', '');
  }

  /**
   * Save screenshot metadata after capture.
   * In production, this is called after Playwright captures and uploads to R2.
   */
  async saveScreenshot(data: ScreenshotCapture) {
    const screenshot = await this.prisma.screenshot.create({
      data: {
        rawScrapeDataId: data.rawScrapeDataId,
        bankId: data.bankId,
        url: data.url,
        type: data.type,
        filePath: data.filePath,
        fileSize: data.fileSize,
        width: data.width,
        height: data.height,
      },
    });

    this.logger.log(`Screenshot saved: ${data.type} for ${data.url} (${(data.fileSize / 1024).toFixed(1)}KB)`);
    return screenshot;
  }

  /**
   * Capture screenshots using Playwright and upload to R2.
   */
  async captureScreenshots(
    rawScrapeDataId: string,
    bankId: string,
    url: string,
    pageContent: string,
  ): Promise<{ fullPage: ScreenshotCapture | null; cropped: ScreenshotCapture | null }> {
    let fullPage: ScreenshotCapture | null = null;
    let cropped: ScreenshotCapture | null = null;

    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });

      try {
        const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        await page.setContent(pageContent, { waitUntil: 'networkidle', timeout: 15000 });

        // Full-page screenshot
        const fullPageBuffer = await page.screenshot({ fullPage: true, type: 'png' });
        const fullPagePath = `screenshots/${bankId}/${rawScrapeDataId}/full-page.png`;

        fullPage = {
          rawScrapeDataId,
          bankId,
          url,
          type: 'FULL_PAGE',
          filePath: fullPagePath,
          fileSize: fullPageBuffer.length,
          width: 1280,
          height: 900,
        };

        // Save metadata
        await this.saveScreenshot(fullPage);

        // Cropped screenshot (try to find the rate table)
        const rateTable = await page.$('table, .exchange-rates, .rates-table, [class*="rate"]');
        if (rateTable) {
          const croppedBuffer = await rateTable.screenshot({ type: 'png' });
          const croppedPath = `screenshots/${bankId}/${rawScrapeDataId}/cropped.png`;

          cropped = {
            rawScrapeDataId,
            bankId,
            url,
            type: 'CROPPED',
            filePath: croppedPath,
            fileSize: croppedBuffer.length,
            width: 1280,
            height: 900,
          };

          await this.saveScreenshot(cropped);
        }

        // In production: upload buffers to Cloudflare R2 here
        await this.uploadToR2(fullPagePath, fullPageBuffer);
        if (cropped) {
          await this.uploadToR2(cropped.filePath, croppedBuffer);
        }

        this.logger.log(`Screenshots captured for ${url}`);
      } finally {
        await browser.close();
      }
    } catch (error) {
      this.logger.error(`Screenshot capture failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    return { fullPage, cropped };
  }

  /**
   * Upload file to Cloudflare R2.
   * Uses S3-compatible API.
   */
  private async uploadToR2(filePath: string, buffer: Buffer): Promise<void> {
    if (!this.r2Endpoint) {
      this.logger.warn('R2 not configured — skipping upload. Would upload to:', filePath);
      return;
    }

    try {
      // S3-compatible upload using fetch
      const response = await fetch(`${this.r2Endpoint}/${this.r2Bucket}/${filePath}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/png',
          'Content-Length': buffer.length.toString(),
        },
        body: buffer,
      });

      if (!response.ok) {
        this.logger.error(`R2 upload failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      this.logger.error(`R2 upload error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Get signed URL for viewing a screenshot.
   */
  async getScreenshotUrl(screenshotId: string): Promise<string | null> {
    const screenshot = await this.prisma.screenshot.findUnique({ where: { id: screenshotId } });
    if (!screenshot) return null;

    if (this.r2Endpoint) {
      return `${this.r2Endpoint}/${this.r2Bucket}/${screenshot.filePath}`;
    }

    // Fallback: return file path for local dev
    return `/api/v1/data-reliability/screenshots/${screenshotId}/file`;
  }

  /**
   * Get all screenshots for a given raw scrape.
   */
  async getScreenshotsForScrape(rawScrapeDataId: string) {
    return this.prisma.screenshot.findMany({
      where: { rawScrapeDataId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
