import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsEnum, IsDateString, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import type { Currency } from '@prisma/client';

const CURRENCY_VALUES = ['ETB', 'USD', 'EUR', 'GBP', 'SAR', 'AED', 'CNY', 'JPY', 'CHF'] as const;

export class QueryRatesDto {
  @ApiPropertyOptional({ description: 'Currency code (USD, EUR, GBP, etc.)', example: 'USD' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currencyTo?: string;

  @ApiPropertyOptional({ description: 'Bank code (CBE, AWIN, DASH, etc.)', example: 'CBE' })
  @IsOptional()
  @IsString()
  bankCode?: string;

  @ApiPropertyOptional({ description: 'Page number (1-based)', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Sort field', example: 'effectiveDate', default: 'effectiveDate' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', example: 'desc', default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class QueryHistoricalRatesDto extends QueryRatesDto {
  @ApiPropertyOptional({ description: 'Start date (ISO 8601)', example: '2024-06-01' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)', example: '2024-06-30' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class CompareRatesDto {
  @ApiPropertyOptional({ description: 'Target currency (USD, EUR, etc.)', example: 'USD' })
  @IsOptional()
  @IsString()
  currencyTo?: string;

  @ApiPropertyOptional({ description: 'Date (ISO 8601) or latest if omitted', example: '2024-06-15' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Bank codes to compare (comma-separated)', example: 'CBE,AWIN,DASH' })
  @IsOptional()
  @IsString()
  banks?: string;
}

export class BestRatesDto {
  @ApiPropertyOptional({ description: 'Target currency (USD, EUR, etc.)', example: 'USD' })
  @IsOptional()
  @IsString()
  currencyTo?: string;

  @ApiPropertyOptional({ description: 'Rate type: buy or sell', example: 'buy', default: 'buy' })
  @IsOptional()
  @IsString()
  type?: 'buy' | 'sell';

  @ApiPropertyOptional({ description: 'Date (ISO 8601) or latest if omitted', example: '2024-06-15' })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class ExportRatesDto {
  @ApiPropertyOptional({ description: 'Bank code filter', example: 'CBE' })
  @IsOptional()
  @IsString()
  bankCode?: string;

  @ApiPropertyOptional({ description: 'Target currency filter (USD, EUR, etc.)', example: 'USD' })
  @IsOptional()
  @IsString()
  currencyTo?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)', example: '2024-06-01' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)', example: '2024-06-30' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Include NBE reference rates', example: false, default: false })
  @IsOptional()
  @IsString()
  includeNbe?: string; // 'true' | 'false'
}
