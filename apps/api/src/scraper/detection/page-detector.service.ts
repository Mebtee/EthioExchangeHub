import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ScrapeMethod } from '../interfaces/bank-scraper.interface';

/**
 * Result of page type detection.
 */
export interface PageDetectionResult {
  method: ScrapeMethod;
  confidence: number; // 0-100 how confident we are
  reason: string;
  detectedSelectors?: string[];
  pageTitle?: string;
  isTablePresent: boolean;
  isPdf: boolean;
  hasAjaxPatterns: boolean;
  hasJsonEndpoint: boolean;
  hasRateKeywords: boolean;
}

@Injectable()
export class PageDetectorService {
  private readonly logger = new Logger(PageDetectorService.name);
  private readonly defaultTimeout: number;

  constructor(private readonly configService: ConfigService) {
    this.defaultTimeout = this.configService.get<number>('scraper.requestTimeout', 30_000);
  }

  /**
   * Probe a bank website and auto-detect the best scraping method.
   * Uses analysis of HTML content, headers, and patterns.
   *
   * Detection logic:
   * 1. Fetch the page
   * 2. Check Content-Type → PDF? → use pdf
   * 3. Check if response is JSON → use api
   * 4. Analyze HTML for:
   *    - AJAX-loading patterns (data- attributes, empty tables, script-heavy)
   *    - Static HTML tables with rate data
   *    - Iframe/embed for PDF
   * 5. Return best method with confidence score
   */
  async detect(url: string): Promise<PageDetectionResult> {
    this.logger.log(`🔍 Auto-detecting page type for ${url}`);

    const defaultResult: PageDetectionResult = {
      method: 'cheerio',
      confidence: 30,
      reason: 'Default fallback — could not determine page type',
      isTablePresent: false,
      isPdf: false,
      hasAjaxPatterns: false,
      hasJsonEndpoint: false,
      hasRateKeywords: false,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);

      let html: string;
      let contentType: string;
      let statusCode: number;

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
        });

        contentType = response.headers.get('content-type') ?? '';
        statusCode = response.status;
        html = await response.text();
      } finally {
        clearTimeout(timeoutId);
      }

      // ── Check 1: PDF ─────────────────────────────────────────
      if (contentType.includes('pdf') || contentType.includes('application/pdf')) {
        return {
          ...defaultResult,
          method: 'pdf',
          confidence: 95,
          reason: 'Content-Type is application/pdf',
          isPdf: true,
        };
      }

      // ── Check 2: JSON/API endpoint ──────────────────────────
      if (contentType.includes('json') || contentType.includes('application/json')) {
        return {
          ...defaultResult,
          method: 'api',
          confidence: 90,
          reason: `Content-Type is ${contentType}`,
          hasJsonEndpoint: true,
        };
      }

      // ── Check 3: HTML Analysis ──────────────────────────────
      const lowerHtml = html.toLowerCase();

      // Detect empty/bare-bones HTML (likely JS-rendered)
      const bodyTextLength = this.extractBodyText(html).length;
      const isSkeletonPage = bodyTextLength < 200 && html.includes('script');

      // Detect AJAX-loading patterns
      const hasAjaxPatterns =
        lowerHtml.includes('/api/') ||
        lowerHtml.includes('ajax') ||
        lowerHtml.includes('fetch(') ||
        lowerHtml.includes('axios') ||
        lowerHtml.includes('xhr') ||
        lowerHtml.includes('data-url') ||
        lowerHtml.includes('data-ajax') ||
        lowerHtml.includes('spa') ||
        lowerHtml.includes('router');

      // Detect JSON endpoint references
      const hasJsonEndpointRef = lowerHtml.includes('/api/') ||
        lowerHtml.includes('application/json') ||
        lowerHtml.includes('json/') ||
        lowerHtml.includes('.json') ||
        lowerHtml.includes('api.');

      // Detect iframe/embed for PDF
      const hasIframePdf =
        lowerHtml.includes('iframe') &&
        (lowerHtml.includes('.pdf') || lowerHtml.includes('pdf-viewer'));

      // Detect rate-related content
      const hasRateKeywords =
        lowerHtml.includes('exchange rate') ||
        lowerHtml.includes('buying') ||
        lowerHtml.includes('selling') ||
        lowerHtml.includes('foreign exchange') ||
        lowerHtml.includes('currency rate');

      // Detect HTML tables
      const hasTable = lowerHtml.includes('<table') || lowerHtml.includes('<caption');

      // Count script tags (JS-heavy pages likely need Playwright)
      const scriptCount = (html.match(/<script/g) || []).length;
      const scriptHeavy = scriptCount > 10;

      // Detect common CMS patterns that indicate static HTML
      const isWordPress = lowerHtml.includes('wp-content') || lowerHtml.includes('wp-json');
      const isJoomla = lowerHtml.includes('joomla');
      const isDrupal = lowerHtml.includes('drupal');

      // ── Detection Decision ──────────────────────────────────

      // PDF via iframe
      if (hasIframePdf) {
        return {
          method: 'pdf',
          confidence: 85,
          reason: 'Page loads PDF via iframe',
          isPdf: true,
          isTablePresent: hasTable,
          hasAjaxPatterns,
          hasJsonEndpoint: hasJsonEndpointRef,
          hasRateKeywords,
        };
      }

      // JSON endpoint embedded in page
      if (hasJsonEndpointRef && lowerHtml.includes('/api/')) {
        return {
          method: 'api',
          confidence: 70,
          reason: 'Page references API/JSON endpoints',
          isPdf: false,
          isTablePresent: hasTable,
          hasAjaxPatterns,
          hasJsonEndpoint: true,
          hasRateKeywords,
        };
      }

      // Static HTML table with rate data
      if (hasTable && hasRateKeywords && !scriptHeavy) {
        return {
          method: 'cheerio',
          confidence: 85,
          reason: 'Static HTML table with exchange rate keywords detected',
          detectedSelectors: this.extractTableSelectors(html),
          isPdf: false,
          isTablePresent: true,
          hasAjaxPatterns,
          hasJsonEndpoint: hasJsonEndpointRef,
          hasRateKeywords,
        };
      }

      // JS-rendered page (skeleton, script-heavy, AJAX patterns)
      if (isSkeletonPage || scriptHeavy || hasAjaxPatterns) {
        return {
          method: 'playwright',
          confidence: isSkeletonPage ? 90 : 75,
          reason: isSkeletonPage
            ? 'Page appears to be a JS-only skeleton (no visible content)'
            : `Page requires JavaScript rendering (${scriptCount} scripts, AJAX patterns: ${hasAjaxPatterns})`,
          detectedSelectors: this.extractSelectors(html),
          isPdf: false,
          isTablePresent: hasTable,
          hasAjaxPatterns,
          hasJsonEndpoint: hasJsonEndpointRef,
          hasRateKeywords,
        };
      }

      // Static HTML but unknown structure (no rate keywords)
      if (!hasRateKeywords && hasTable) {
        return {
          method: 'cheerio',
          confidence: 50,
          reason: 'Static HTML with tables but no rate keywords found',
          isPdf: false,
          isTablePresent: true,
          hasAjaxPatterns,
          hasJsonEndpoint: hasJsonEndpointRef,
          hasRateKeywords,
        };
      }

      // Fallback — try cheerio first, playwright as backup
      return {
        method: 'cheerio',
        confidence: 40,
        reason: 'Ambiguous page structure — defaulting to cheerio',
        isPdf: false,
        isTablePresent: hasTable,
        hasAjaxPatterns,
        hasJsonEndpoint: hasJsonEndpointRef,
        hasRateKeywords: false,
      };
    } catch (error) {
      this.logger.warn(`Failed to detect page type for ${url}: ${error instanceof Error ? error.message : 'Unknown'}`);
      return {
        ...defaultResult,
        reason: `Detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Quick detection based only on URL patterns (no HTTP request).
   * Useful for initial routing decisions.
   */
  detectByUrl(url: string): ScrapeMethod | null {
    const lower = url.toLowerCase();

    if (lower.endsWith('.pdf') || lower.includes('/pdf/')) {
      return 'pdf';
    }

    if (lower.includes('/api/') || lower.endsWith('.json') || lower.includes('api.')) {
      return 'api';
    }

    if (
      lower.includes('#exchange') ||
      lower.includes('#rates') ||
      lower.includes('#currency')
    ) {
      return 'playwright'; // Hash-fragment pages often need JS
    }

    return null; // Cannot determine from URL alone
  }

  // ── Private Helpers ──────────────────────────────────────────

  private extractBodyText(html: string): string {
    const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (!match?.[1]) return '';
    return match[1].replace(/<[^>]*>/g, '').trim();
  }

  private extractTableSelectors(html: string): string[] {
    const selectors: string[] = [];
    const tableMatches = html.matchAll(/<table[^>]*class="([^"]*)"/gi);
    for (const match of tableMatches) {
      if (match[1]) selectors.push(`table.${match[1]}`);
    }
    return selectors;
  }

  private extractSelectors(html: string): string[] {
    const selectors: string[] = [];
    const idMatches = html.matchAll(/id="([^"]*(?:rate|exchange|currency|table)[^"]*)"/gi);
    for (const match of idMatches) {
      if (match[1]) selectors.push(`#${match[1]}`);
    }
    const classMatches = html.matchAll(/class="([^"]*(?:rate|exchange|currency|table)[^"]*)"/gi);
    for (const match of classMatches) {
      if (match[1]) selectors.push(`.${match[1].replace(/\s+/g, '.')}`);
    }
    return selectors.slice(0, 10); // Limit to 10
  }
}
