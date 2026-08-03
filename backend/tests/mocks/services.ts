/**
 * Mock service factories.
 *
 * Controllers receive service interfaces via constructor injection; these
 * factories build plain mock objects (all methods `vi.fn()`) typed as the
 * service interfaces, keeping controller tests fully isolated.
 */

import { vi } from "vitest";

import type { BanksService } from "@/services/BanksService";
import type { ExchangeRatesService } from "@/services/ExchangeRatesService";
import type { ManualRatesService } from "@/services/ManualRatesService";
import type { ScraperHealthService } from "@/services/ScraperHealthService";
import type { ScrapeLogsService } from "@/services/ScrapeLogsService";

/** Builds a mock BanksService. */
export function createMockBanksService(
  overrides: Partial<Record<keyof BanksService, unknown>> = {},
): BanksService {
  return {
    listBanks: vi.fn(),
    listActiveBanks: vi.fn(),
    findByBankCode: vi.fn(),
    validateBankExists: vi.fn(),
    validateBankActive: vi.fn(),
    ...overrides,
  } as unknown as BanksService;
}

/** Builds a mock ExchangeRatesService. */
export function createMockExchangeRatesService(
  overrides: Partial<Record<keyof ExchangeRatesService, unknown>> = {},
): ExchangeRatesService {
  return {
    getLatestRates: vi.fn(),
    getLatestRatesByCurrency: vi.fn(),
    getLatestRatesByBank: vi.fn(),
    getLatestRateByBankAndCurrency: vi.fn(),
    getHistoricalRates: vi.fn(),
    ...overrides,
  } as unknown as ExchangeRatesService;
}

/** Builds a mock ManualRatesService. */
export function createMockManualRatesService(
  overrides: Partial<Record<keyof ManualRatesService, unknown>> = {},
): ManualRatesService {
  return {
    createManualRate: vi.fn(),
    updateManualRate: vi.fn(),
    deleteManualRate: vi.fn(),
    listManualRates: vi.fn(),
    ...overrides,
  } as unknown as ManualRatesService;
}

/** Builds a mock ScraperHealthService. */
export function createMockScraperHealthService(
  overrides: Partial<Record<keyof ScraperHealthService, unknown>> = {},
): ScraperHealthService {
  return {
    getSummary: vi.fn(),
    listHealthy: vi.fn(),
    listDegraded: vi.fn(),
    listFailed: vi.fn(),
    findByBankCode: vi.fn(),
    ...overrides,
  } as unknown as ScraperHealthService;
}

/** Builds a mock ScrapeLogsService. */
export function createMockScrapeLogsService(
  overrides: Partial<Record<keyof ScrapeLogsService, unknown>> = {},
): ScrapeLogsService {
  return {
    getLatestLogs: vi.fn(),
    getLogsByBank: vi.fn(),
    getLogsByRun: vi.fn(),
    listLogs: vi.fn(),
    ...overrides,
  } as unknown as ScrapeLogsService;
}
