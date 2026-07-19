import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { RawScrapedRate } from '../interfaces/bank-scraper.interface';
import { HtmlParserService } from './html-parser.service';

@Injectable()
export class PlaywrightParserService implements OnModuleDestroy {
  private readonly logger = new Logger(PlaywrightParserService.name);
  private browser: import('playwright').Browser | null = null;

  constructor(private readonly htmlParser: HtmlParserService) {}

  /**
   * Fetch page content using Playwright (headless browser).
   * Use this for pages that require JavaScript rendering.
   */
  async fetchPage(url: string, timeout = 30_000): Promise<string> {
    const { chromium } = await import('playwright');

    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }

    const context = await this.browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout });
      // Wait for common rate table selectors
      await page.waitForSelector('table, .rate-item, [class*="rate"]', { timeout: 10_000 }).catch(() => {});
      return await page.content();
    } finally {
      await page.close();
      await context.close();
    }
  }

  /**
   * Fetch and parse exchange rates from a JS-rendered page.
   */
  async fetchAndParse(url: string): Promise<RawScrapedRate[]> {
    const html = await this.fetchPage(url);
    return this.htmlParser.parseTable(html);
  }

  /**
   * Clean up browser resources on module destroy.
   */
  async onModuleDestroy(): Promise<void> {
    await this.closeBrowser();
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
