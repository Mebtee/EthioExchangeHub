import { ConflictError, NotFoundError } from "@/lib/errors";
import { ManualRatesRepository } from "@/repositories/ManualRatesRepository";
import type { ManualRateRow } from "@/types/database";
import { nowIso } from "@/utils/date";
import type { BanksService } from "./BanksService";
import { sortByRateDate } from "./helpers/Sorting";
import {
  assertBankCode,
  assertCurrencyCode,
  assertIsoDate,
  assertNullablePositiveRate,
  assertPositiveRate,
} from "./helpers/Validation";

/** Input for creating a manual rate (domain shape — no API DTO yet). */
export interface ManualRateInput {
  bank_code: string;
  currency_code: string;
  /** Cash buying rate (positive). */
  buying_rate: number;
  /** Cash selling rate (positive). */
  selling_rate: number;
  /** Transactional buying rate; null when not published. */
  transactional_buying?: number | null;
  /** Transactional selling rate; null when not published. */
  transactional_selling?: number | null;
  /** ISO date (YYYY-MM-DD). */
  rate_date: string;
  note?: string | null;
  /** FK → auth user id; optional for now. */
  entered_by?: string | null;
}

/** Partial input for updating a manual rate. */
export type UpdateManualRateInput = Partial<ManualRateInput>;

/** Optional filters for listing manual rates. */
export interface ManualRateFilter {
  bankCode?: string;
  currencyCode?: string;
  rateDate?: string;
}

/** Public contract of the manual-rates service. */
export interface ManualRatesService {
  createManualRate(input: ManualRateInput): Promise<ManualRateRow>;
  updateManualRate(id: string, updates: UpdateManualRateInput): Promise<ManualRateRow>;
  deleteManualRate(id: string): Promise<void>;
  listManualRates(filter?: ManualRateFilter): Promise<ManualRateRow[]>;
}

/**
 * Manual-rate business logic: business validation, duplicate detection,
 * timestamp management, and note handling live here. The repository only
 * persists rows.
 */
export class ManualRatesServiceImpl implements ManualRatesService {
  constructor(
    private readonly manualRatesRepository: ManualRatesRepository,
    private readonly banksService: BanksService,
  ) {}

  /** Creates a manual rate after validating the bank, currency, dates and duplicates. */
  async createManualRate(input: ManualRateInput): Promise<ManualRateRow> {
    assertBankCode(input.bank_code);
    await this.banksService.validateBankExists(input.bank_code);
    assertCurrencyCode(input.currency_code);
    assertIsoDate(input.rate_date);
    assertPositiveRate(input.buying_rate);
    assertPositiveRate(input.selling_rate);
    assertNullablePositiveRate(input.transactional_buying);
    assertNullablePositiveRate(input.transactional_selling);

    await this.assertNoDuplicate({
      bank_code: input.bank_code,
      currency_code: input.currency_code,
      rate_date: input.rate_date,
    });

    return this.manualRatesRepository.insert({
      bank_code: input.bank_code,
      currency_code: input.currency_code,
      buying_rate: input.buying_rate,
      selling_rate: input.selling_rate,
      transactional_buying: input.transactional_buying ?? null,
      transactional_selling: input.transactional_selling ?? null,
      rate_date: input.rate_date,
      note: normalizeNote(input.note),
      entered_by: input.entered_by ?? null,
      created_at: nowIso(),
    });
  }

  /** Updates an existing manual rate, re-validating changed fields and duplicates. */
  async updateManualRate(id: string, updates: UpdateManualRateInput): Promise<ManualRateRow> {
    const existing = await this.getExisting(id);

    if (updates.bank_code !== undefined && updates.bank_code !== existing.bank_code) {
      assertBankCode(updates.bank_code);
      await this.banksService.validateBankExists(updates.bank_code);
    }
    if (updates.currency_code !== undefined) assertCurrencyCode(updates.currency_code);
    if (updates.rate_date !== undefined) assertIsoDate(updates.rate_date);
    if (updates.buying_rate !== undefined) assertPositiveRate(updates.buying_rate);
    if (updates.selling_rate !== undefined) assertPositiveRate(updates.selling_rate);
    if (updates.transactional_buying !== undefined)
      assertNullablePositiveRate(updates.transactional_buying);
    if (updates.transactional_selling !== undefined)
      assertNullablePositiveRate(updates.transactional_selling);

    await this.assertNoDuplicate(
      {
        bank_code: updates.bank_code ?? existing.bank_code,
        currency_code: updates.currency_code ?? existing.currency_code,
        rate_date: updates.rate_date ?? existing.rate_date,
      },
      id,
    );

    const row = await this.manualRatesRepository.updateBy(
      { id },
      {
        ...(updates.bank_code !== undefined ? { bank_code: updates.bank_code } : {}),
        ...(updates.currency_code !== undefined ? { currency_code: updates.currency_code } : {}),
        ...(updates.buying_rate !== undefined ? { buying_rate: updates.buying_rate } : {}),
        ...(updates.selling_rate !== undefined ? { selling_rate: updates.selling_rate } : {}),
        ...(updates.transactional_buying !== undefined
          ? { transactional_buying: updates.transactional_buying }
          : {}),
        ...(updates.transactional_selling !== undefined
          ? { transactional_selling: updates.transactional_selling }
          : {}),
        ...(updates.rate_date !== undefined ? { rate_date: updates.rate_date } : {}),
        ...(updates.note !== undefined ? { note: normalizeNote(updates.note) } : {}),
        ...(updates.entered_by !== undefined ? { entered_by: updates.entered_by } : {}),
      },
    );
    if (row === null) {
      throw new NotFoundError(`Manual rate "${id}" was removed before the update completed.`);
    }
    return row;
  }

  /** Deletes a manual rate, throwing NotFoundError when absent. */
  async deleteManualRate(id: string): Promise<void> {
    await this.getExisting(id);
    const deleted = await this.manualRatesRepository.deleteBy({ id });
    if (!deleted) {
      throw new NotFoundError(`Manual rate "${id}" was removed before the delete completed.`);
    }
  }

  /** Lists manual rates, newest first, with optional filters. */
  async listManualRates(filter?: ManualRateFilter): Promise<ManualRateRow[]> {
    const rows = await this.manualRatesRepository.findAll();
    const filtered = rows.filter((row) => {
      if (filter?.bankCode && row.bank_code !== filter.bankCode) return false;
      if (filter?.currencyCode && row.currency_code !== filter.currencyCode) return false;
      if (filter?.rateDate && row.rate_date !== filter.rateDate) return false;
      return true;
    });
    return sortByRateDate(filtered, false);
  }

  /** Returns the existing row or throws NotFoundError. */
  private async getExisting(id: string): Promise<ManualRateRow> {
    const existing = await this.manualRatesRepository.findOneBy({ id });
    if (existing === null) {
      throw new NotFoundError(`Manual rate "${id}" not found.`);
    }
    return existing;
  }

  /**
   * Throws ConflictError when a manual rate already occupies the exact
   * (bank, currency, date) key. `selfId` excludes the row being updated.
   */
  private async assertNoDuplicate(
    key: { bank_code: string; currency_code: string; rate_date: string },
    selfId?: string,
  ): Promise<void> {
    const duplicate = await this.manualRatesRepository.findOneBy(key);
    if (duplicate !== null && duplicate.id !== selfId) {
      throw new ConflictError(
        `A manual rate for ${key.bank_code} / ${key.currency_code} on ${key.rate_date} already exists.`,
      );
    }
  }
}

/** Trims a note; empty/whitespace becomes null. */
function normalizeNote(note: string | null | undefined): string | null {
  if (typeof note !== "string") return null;
  const trimmed = note.trim();
  return trimmed.length > 0 ? trimmed : null;
}
