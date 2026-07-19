import {
  Controller,
  Get,
  Query,
  Header,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProduces } from '@nestjs/swagger';
import type { Response } from 'express';

import { ExchangeRatesService } from './exchange-rates.service';
import {
  QueryRatesDto,
  QueryHistoricalRatesDto,
  CompareRatesDto,
  BestRatesDto,
  ExportRatesDto,
} from './dto/query-rates.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Exchange Rates')
@Public()
@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  @Get('latest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get latest exchange rates for all banks', description: 'Returns the most recent exchange rates per currency per bank with pagination, filtering by bank or currency, and sorting.' })
  async getLatestRates(@Query() query: QueryRatesDto) {
    return this.exchangeRatesService.getLatestRates(query);
  }

  @Get('historical')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get historical exchange rates', description: 'Returns exchange rates with date range filtering, pagination, and sorting. Supports filtering by bank and currency.' })
  async getHistoricalRates(@Query() query: QueryHistoricalRatesDto) {
    return this.exchangeRatesService.getHistoricalRates(query);
  }

  @Get('compare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Compare exchange rates across banks', description: 'Returns side-by-side comparison of rates for a specific currency across multiple banks. Includes NBE reference rate and summary statistics.' })
  async compareRates(@Query() query: CompareRatesDto) {
    return this.exchangeRatesService.compareRates(query);
  }

  @Get('best')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get best buy/sell rates', description: 'Returns the best and worst rates across all banks for a specific currency, including the average rate.' })
  async getBestRates(@Query() query: BestRatesDto) {
    return this.exchangeRatesService.getBestRates(query);
  }

  @Get('export/csv')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export exchange rates as CSV', description: 'Downloads exchange rate data as a CSV file with optional filtering by bank, currency, and date range.' })
  @ApiProduces('text/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="exchange-rates.csv"')
  async exportCsv(@Query() query: ExportRatesDto) {
    return this.exchangeRatesService.exportCsv(query);
  }

  @Get('export/pdf')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export exchange rates as PDF', description: 'Generates a downloadable PDF report with exchange rate data using Playwright headless browser.' })
  @ApiProduces('application/pdf')
  async exportPdf(@Query() query: ExportRatesDto, @Res() res: Response) {
    const pdf = await this.exchangeRatesService.exportPdf(query);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="exchange-rates-report.pdf"');
    res.setHeader('Content-Length', pdf.length);
    res.end(pdf);
  }

  @Get('currencies')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get list of supported currencies', description: 'Returns all supported currencies for exchange rate lookups.' })
  getCurrencies() {
    return {
      data: ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'],
      base: 'ETB',
    };
  }
}
