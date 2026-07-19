import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { QueryRatesDto, QueryHistoricalRatesDto, CompareRatesDto, BestRatesDto, ExportRatesDto } from './dto/query-rates.dto';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RateResponse {
  id: string;
  bankId: string;
  bankName: string;
  bankCode: string;
  currencyFrom: string;
  currencyTo: string;
  buyRate: number;
  sellRate: number;
  midRate: number | null;
  spread: number;
  source: string;
  effectiveDate: string;
  updatedAt: string;
}

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);

  private readonly CURRENCY_MAP: Record<string, string> = {
    USD: 'USD', 'US DOLLAR': 'USD',
    EUR: 'EUR', EURO: 'EUR',
    GBP: 'GBP', 'POUND STERLING': 'GBP',
    SAR: 'SAR', 'SAUDI RIYAL': 'SAR',
    AED: 'AED', 'UAE DIRHAM': 'AED',
    CNY: 'CNY', 'CHINESE YUAN': 'CNY',
    JPY: 'JPY', 'JAPANESE YEN': 'JPY',
    CHF: 'CHF', 'SWISS FRANC': 'CHF',
  };

  constructor(private readonly prisma: PrismaService) {}

  // ── Latest Rates ─────────────────────────────────────────────
  async getLatestRates(query: QueryRatesDto): Promise<PaginatedResult<RateResponse>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const currencyTo = query.currencyTo?.toUpperCase();
    const bankCode = query.bankCode?.toUpperCase();

    // Step 1: Get the latest effectiveDate for each (bankId, currencyTo) combination
    // using a raw subquery approach to avoid DISTINCT ON issues with cross-table ORDER BY
    const latestDateSubquery = this.prisma.exchangeRate.groupBy({
      by: ['bankId', 'currencyTo'],
      _max: { effectiveDate: true },
      where: {
        ...(currencyTo ? { currencyTo: currencyTo as any } : {}),
        ...(bankCode ? { bank: { code: bankCode } } : {}),
      },
    });

    const groupings = await latestDateSubquery;

    // Step 2: Build WHERE clause to fetch full records matching the latest dates
    const dateFilters = groupings
      .sort((a, b) => a.bankId.localeCompare(b.bankId))
      .map((g) => ({
        bankId: g.bankId,
        currencyTo: g.currencyTo,
        effectiveDate: g._max?.effectiveDate ?? undefined,
      }))
      .filter((f) => f.effectiveDate !== undefined);

    // Count total distinct combinations
    const total = dateFilters.length;

    // Guard: if no rates found, return empty paginated result
    if (total === 0) {
      return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
    }

    // Step 3: Fetch full records with bank info, paginated
    const paginatedFilters = dateFilters.slice(skip, skip + limit);
    const rates = await this.prisma.exchangeRate.findMany({
      where: {
        OR: paginatedFilters,
      },
      include: {
        bank: { select: { id: true, name: true, code: true } },
      },
      orderBy: [
        { effectiveDate: 'desc' },
        { currencyTo: 'asc' },
      ],
    });

    // Step 4: Sort by bank sortOrder (in-memory, since we can't mix with cross-table ORDER BY)
    const sorted = rates.sort((a, b) => {
      const orderA = (a.bank as any)?.sortOrder ?? 0;
      const orderB = (b.bank as any)?.sortOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.currencyTo.localeCompare(b.currencyTo);
    });

    const data = sorted.map((r) => this.formatRate(r));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Historical Rates ─────────────────────────────────────────
  async getHistoricalRates(query: QueryHistoricalRatesDto): Promise<PaginatedResult<RateResponse>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = this.getSortField(query.sortBy ?? 'effectiveDate');
    const sortOrder = query.sortOrder ?? 'desc';

    const where: any = {};

    if (query.currencyTo) {
      where.currencyTo = query.currencyTo.toUpperCase();
    }
    if (query.bankCode) {
      where.bank = { code: query.bankCode.toUpperCase() };
    }

    // Date range filter
    if (query.fromDate || query.toDate) {
      where.effectiveDate = {};
      if (query.fromDate) {
        where.effectiveDate.gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        where.effectiveDate.lte = new Date(query.toDate);
      }
    }

    const [rates, total] = await Promise.all([
      this.prisma.exchangeRate.findMany({
        where,
        include: {
          bank: { select: { id: true, name: true, code: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip,
      }),
      this.prisma.exchangeRate.count({ where }),
    ]);

    const data = rates.map((r) => this.formatRate(r));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Compare Banks ────────────────────────────────────────────
  async compareRates(query: CompareRatesDto) {
    const currencyTo = query.currencyTo?.toUpperCase() ?? 'USD';

    // Determine effective date
    let effectiveDate: Date;
    if (query.date) {
      effectiveDate = new Date(query.date);
    } else {
      // Get latest date for this currency
      const latest = await this.prisma.exchangeRate.findFirst({
        where: { currencyTo: currencyTo as any },
        orderBy: { effectiveDate: 'desc' },
        select: { effectiveDate: true },
      });
      effectiveDate = latest?.effectiveDate ?? new Date();
    }

    // Build bank filter
    const bankCodes = query.banks
      ? query.banks.split(',').map((b) => b.trim().toUpperCase())
      : undefined;

    const where: any = {
      currencyTo: currencyTo as any,
      effectiveDate: {
        gte: new Date(effectiveDate.setHours(0, 0, 0, 0)),
        lt: new Date(effectiveDate.setHours(23, 59, 59, 999)),
      },
    };

    if (bankCodes) {
      where.bank = { code: { in: bankCodes } };
    }

    const rates = await this.prisma.exchangeRate.findMany({
      where,
      include: {
        bank: { select: { id: true, name: true, code: true } },
      },
      orderBy: { bank: { sortOrder: 'asc' } },
    });

    const data = rates.map((r) => this.formatRate(r));

    // Also fetch NBE reference rate for comparison
    const nbeRate = await this.prisma.nbeReferenceRate.findFirst({
      where: {
        currencyTo: currencyTo as any,
        effectiveDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    return {
      currencyTo,
      effectiveDate: effectiveDate.toISOString(),
      banks: data,
      nbeReference: nbeRate
        ? {
            buyRate: Number(nbeRate.buyRate),
            sellRate: Number(nbeRate.sellRate),
            midRate: Number(nbeRate.midRate ?? 0),
          }
        : null,
      summary: this.computeSummary(data),
    };
  }

  // ── Best Buy/Sell ────────────────────────────────────────────
  async getBestRates(query: BestRatesDto) {
    const currencyTo = query.currencyTo?.toUpperCase() ?? 'USD';
    const type = query.type ?? 'buy';
    const rateField = type === 'buy' ? 'buyRate' : 'sellRate';

    // Get latest rates for this currency across all banks
    const rates = await this.prisma.exchangeRate.findMany({
      where: { currencyTo: currencyTo as any },
      include: {
        bank: { select: { id: true, name: true, code: true } },
      },
      orderBy: [
        { effectiveDate: 'desc' },
        { [rateField]: type === 'buy' ? 'desc' : 'asc' },
      ],
      distinct: ['bankId', 'currencyTo'],
    });

    const data = rates.map((r) => this.formatRate(r));

    // Sort by the requested rate type
    data.sort((a, b) => {
      const valA = type === 'buy' ? a.buyRate : a.sellRate;
      const valB = type === 'buy' ? b.buyRate : b.sellRate;
      return type === 'buy' ? valB - valA : valA - valB;
    });

    // Get best and worst
    const best = data.length > 0 ? data[0]! : null;
    const worst = data.length > 0 ? data[data.length - 1]! : null;

    // Get average
    const avgRate =
      data.length > 0
        ? data.reduce((sum, r) => sum + (type === 'buy' ? r.buyRate : r.sellRate), 0) / data.length
        : 0;

    return {
      currencyTo,
      type,
      best,
      worst,
      average: Math.round(avgRate * 10000) / 10000,
      banks: data,
      totalBanks: data.length,
    };
  }

  // ── CSV Export ───────────────────────────────────────────────
  async exportCsv(query: ExportRatesDto): Promise<string> {
    const rates = await this.queryExportData(query);

    const headers = ['Bank', 'Currency', 'Buy Rate', 'Sell Rate', 'Mid Rate', 'Spread', 'Date', 'Source'];
    const rows = rates.map((r) => [
      r.bankName,
      r.currencyTo,
      r.buyRate.toString(),
      r.sellRate.toString(),
      r.midRate?.toString() ?? '',
      r.spread.toFixed(4),
      r.effectiveDate,
      r.source,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  // ── PDF Export (Playwright-generated PDF) ───────────────────
  async exportPdf(query: ExportRatesDto): Promise<Buffer> {
    const rates = await this.queryExportData(query);
    const html = this.buildReportHtml(rates);

    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div style="font-size:8px;color:#888;">EthioBanksHub — Exchange Rate Report</div>',
        footerTemplate: '<div style="font-size:8px;color:#888;text-align:center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  private buildReportHtml(rates: RateResponse[]): string {
    const rows = rates
      .map(
        (r) => `
      <tr>
        <td>${this.escapeHtml(r.bankName)}</td>
        <td>${r.currencyTo}</td>
        <td>${r.buyRate.toFixed(4)}</td>
        <td>${r.sellRate.toFixed(4)}</td>
        <td>${r.midRate?.toFixed(4) ?? '-'}</td>
        <td>${r.spread.toFixed(4)}</td>
        <td>${r.effectiveDate.split('T')[0]}</td>
      </tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>EthioBanksHub — Exchange Rate Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; font-size: 10pt; }
    h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 8px; font-size: 18pt; }
    .subtitle { color: #6b7280; margin-top: -10px; font-size: 9pt; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 9pt; }
    th { background: #1e40af; color: white; padding: 8px 6px; text-align: left; font-weight: 600; }
    td { padding: 6px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) { background: #f9fafb; }
    .footer { margin-top: 30px; font-size: 8pt; color: #9ca3af; text-align: center; }
    @media print { body { -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <h1>EthioBanksHub — Exchange Rate Report</h1>
  <p class="subtitle">Generated: ${new Date().toLocaleString('en-ET', { timeZone: 'Africa/Addis_Ababa' })} | ${rates.length} rates</p>
  <table>
    <thead>
      <tr>
        <th>Bank</th><th>Currency</th><th>Buy Rate</th><th>Sell Rate</th><th>Mid Rate</th><th>Spread</th><th>Date</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">EthioBanksHub — https://ethiobankshub.com | Data may change without notice</div>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── Helpers ──────────────────────────────────────────────────
  private async queryExportData(query: ExportRatesDto): Promise<RateResponse[]> {
    const where: any = {};

    if (query.currencyTo) {
      where.currencyTo = query.currencyTo.toUpperCase();
    }
    if (query.bankCode) {
      where.bank = { code: query.bankCode.toUpperCase() };
    }
    if (query.fromDate || query.toDate) {
      where.effectiveDate = {};
      if (query.fromDate) where.effectiveDate.gte = new Date(query.fromDate);
      if (query.toDate) where.effectiveDate.lte = new Date(query.toDate);
    }

    const rates = await this.prisma.exchangeRate.findMany({
      where,
      include: {
        bank: { select: { id: true, name: true, code: true } },
      },
      orderBy: [
        { bank: { sortOrder: 'asc' } },
        { currencyTo: 'asc' },
        { effectiveDate: 'desc' },
      ],
    });

    const formatted = rates.map((r) => this.formatRate(r));

    // Include NBE reference rates if requested
    if (query.includeNbe === 'true') {
      const nbeRates = await this.prisma.nbeReferenceRate.findMany({
        where: query.currencyTo
          ? { currencyTo: query.currencyTo as any }
          : undefined,
        orderBy: [{ currencyTo: 'asc' }, { effectiveDate: 'desc' }],
      });

      nbeRates.forEach((r) => {
        formatted.push({
          id: r.id,
          bankId: 'NBE',
          bankName: 'National Bank of Ethiopia (Reference)',
          bankCode: 'NBE',
          currencyFrom: r.currencyFrom,
          currencyTo: r.currencyTo,
          buyRate: Number(r.buyRate),
          sellRate: Number(r.sellRate),
          midRate: Number(r.midRate ?? 0),
          spread: Number((r.sellRate as any) - (r.buyRate as any)),
          source: 'nbe',
          effectiveDate: r.effectiveDate.toISOString(),
          updatedAt: r.createdAt.toISOString(),
        });
      });
    }

    return formatted;
  }

  private formatRate(r: any): RateResponse {
    const buyRate = Number(r.buyRate);
    const sellRate = Number(r.sellRate);
    return {
      id: r.id,
      bankId: r.bank?.id ?? r.bankId ?? '',
      bankName: r.bank?.name ?? 'Unknown',
      bankCode: r.bank?.code ?? '',
      currencyFrom: r.currencyFrom,
      currencyTo: r.currencyTo,
      buyRate,
      sellRate,
      midRate: r.midRate ? Number(r.midRate) : null,
      spread: Math.round((sellRate - buyRate) * 10000) / 10000,
      source: r.source,
      effectiveDate: r.effectiveDate instanceof Date
        ? r.effectiveDate.toISOString()
        : r.effectiveDate,
      updatedAt: r.updatedAt instanceof Date
        ? r.updatedAt.toISOString()
        : new Date().toISOString(),
    };
  }

  private computeSummary(data: RateResponse[]) {
    if (data.length === 0) return null;

    const buyRates = data.map((r) => r.buyRate);
    const sellRates = data.map((r) => r.sellRate);
    const spreads = data.map((r) => r.spread);

    return {
      banksCount: data.length,
      averageBuyRate: Math.round(buyRates.reduce((a, b) => a + b, 0) / buyRates.length * 10000) / 10000,
      averageSellRate: Math.round(sellRates.reduce((a, b) => a + b, 0) / sellRates.length * 10000) / 10000,
      bestBuyRate: Math.max(...buyRates),
      bestBuyBank: data.find((r) => r.buyRate === Math.max(...buyRates))?.bankName ?? '',
      bestSellRate: Math.min(...sellRates),
      bestSellBank: data.find((r) => r.sellRate === Math.min(...sellRates))?.bankName ?? '',
      averageSpread: Math.round(spreads.reduce((a, b) => a + b, 0) / spreads.length * 10000) / 10000,
    };
  }

  private getSortField(sortBy: string): string {
    const allowedFields = ['effectiveDate', 'buyRate', 'sellRate', 'createdAt', 'currencyTo'];
    return allowedFields.includes(sortBy) ? sortBy : 'effectiveDate';
  }
}
