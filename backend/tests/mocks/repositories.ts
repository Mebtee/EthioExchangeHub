/**
 * Mock repository factories.
 *
 * Services receive concrete repository classes via constructor injection;
 * these factories build plain mock objects (all methods `vi.fn()`) that are
 * cast to the repository type, so services are unit-tested in isolation.
 */

import { vi } from "vitest";

import type { BanksRepository } from "@/repositories/BanksRepository";
import type { ExchangeRatesRepository } from "@/repositories/ExchangeRatesRepository";
import type { ManualRatesRepository } from "@/repositories/ManualRatesRepository";
import type { ScraperHealthRepository } from "@/repositories/ScraperHealthRepository";
import type { ScrapeLogsRepository } from "@/repositories/ScrapeLogsRepository";
import type { SettingsRepository } from "@/repositories/SettingsRepository";
import type { UsersRepository } from "@/repositories/UsersRepository";

/** Builds a mock BanksRepository. */
export function createMockBanksRepository(
  overrides: Partial<Record<keyof BanksRepository, unknown>> = {},
): BanksRepository {
  const mock: Record<string, unknown> = {
    findAll: vi.fn(),
    findOneBy: vi.fn(),
    findManyBy: vi.fn(),
    findLatestBy: vi.fn(),
    insert: vi.fn(),
    updateBy: vi.fn(),
    deleteBy: vi.fn(),
    findByBankCode: vi.fn(),
    listActive: vi.fn(),
    ...overrides,
  };
  return mock as unknown as BanksRepository;
}

/** Builds a mock ExchangeRatesRepository. */
export function createMockExchangeRatesRepository(
  overrides: Partial<Record<keyof ExchangeRatesRepository, unknown>> = {},
): ExchangeRatesRepository {
  const mock: Record<string, unknown> = {
    findAll: vi.fn(),
    findOneBy: vi.fn(),
    findManyBy: vi.fn(),
    findLatestBy: vi.fn(),
    insert: vi.fn(),
    updateBy: vi.fn(),
    deleteBy: vi.fn(),
    findLatestByBankAndCurrency: vi.fn(),
    findByBankAndCurrency: vi.fn(),
    findByCurrency: vi.fn(),
    ...overrides,
  };
  return mock as unknown as ExchangeRatesRepository;
}

/** Builds a mock ManualRatesRepository. */
export function createMockManualRatesRepository(
  overrides: Partial<Record<keyof ManualRatesRepository, unknown>> = {},
): ManualRatesRepository {
  const mock: Record<string, unknown> = {
    findAll: vi.fn(),
    findOneBy: vi.fn(),
    findManyBy: vi.fn(),
    findLatestBy: vi.fn(),
    insert: vi.fn(),
    updateBy: vi.fn(),
    deleteBy: vi.fn(),
    findLatestByBankAndCurrency: vi.fn(),
    findByBankAndCurrency: vi.fn(),
    ...overrides,
  };
  return mock as unknown as ManualRatesRepository;
}

/** Builds a mock ScraperHealthRepository. */
export function createMockScraperHealthRepository(
  overrides: Partial<Record<keyof ScraperHealthRepository, unknown>> = {},
): ScraperHealthRepository {
  const mock: Record<string, unknown> = {
    findAll: vi.fn(),
    findOneBy: vi.fn(),
    findManyBy: vi.fn(),
    findLatestBy: vi.fn(),
    insert: vi.fn(),
    updateBy: vi.fn(),
    deleteBy: vi.fn(),
    findByBankCode: vi.fn(),
    ...overrides,
  };
  return mock as unknown as ScraperHealthRepository;
}

/** Builds a mock ScrapeLogsRepository. */
export function createMockScrapeLogsRepository(
  overrides: Partial<Record<keyof ScrapeLogsRepository, unknown>> = {},
): ScrapeLogsRepository {
  const mock: Record<string, unknown> = {
    findAll: vi.fn(),
    findOneBy: vi.fn(),
    findManyBy: vi.fn(),
    findLatestBy: vi.fn(),
    insert: vi.fn(),
    updateBy: vi.fn(),
    deleteBy: vi.fn(),
    findByBankCode: vi.fn(),
    findByRunId: vi.fn(),
    ...overrides,
  };
  return mock as unknown as ScrapeLogsRepository;
}

/** Builds a mock SettingsRepository. */
export function createMockSettingsRepository(
  overrides: Partial<Record<keyof SettingsRepository, unknown>> = {},
): SettingsRepository {
  const mock: Record<string, unknown> = {
    findAll: vi.fn(),
    findOneBy: vi.fn(),
    findManyBy: vi.fn(),
    findLatestBy: vi.fn(),
    insert: vi.fn(),
    updateBy: vi.fn(),
    deleteBy: vi.fn(),
    findAllSettings: vi.fn(),
    upsertMany: vi.fn(),
    ...overrides,
  };
  return mock as unknown as SettingsRepository;
}

/** Builds a mock UsersRepository. */
export function createMockUsersRepository(
  overrides: Partial<Record<keyof UsersRepository, unknown>> = {},
): UsersRepository {
  const mock: Record<string, unknown> = {
    findAll: vi.fn(),
    findOneBy: vi.fn(),
    findManyBy: vi.fn(),
    findLatestBy: vi.fn(),
    insert: vi.fn(),
    updateBy: vi.fn(),
    deleteBy: vi.fn(),
    findByEmail: vi.fn(),
    findById: vi.fn(),
    ...overrides,
  };
  return mock as unknown as UsersRepository;
}
