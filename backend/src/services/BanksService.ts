import { NotFoundError, ValidationError } from "@/lib/errors";
import { BanksRepository } from "@/repositories/BanksRepository";
import type { BankRow } from "@/types/database";
import { sortBanksByName } from "./helpers/Sorting";

/** Optional filters for listing banks. */
export interface BanksFilter {
  /** Only banks currently flagged active (default: all banks). */
  activeOnly?: boolean;
  /** Only banks of the given type (e.g. "state_owned"). */
  bankType?: string;
}

/** Public contract of the banks service (business logic only, no database concerns). */
export interface BanksService {
  listBanks(filter?: BanksFilter): Promise<BankRow[]>;
  listActiveBanks(): Promise<BankRow[]>;
  findByBankCode(bankCode: string): Promise<BankRow>;
  /** Like findByBankCode but INACTIVE banks answer NotFound (commercial directory). */
  findActiveByBankCode(bankCode: string): Promise<BankRow>;
  validateBankExists(bankCode: string): Promise<void>;
  validateBankActive(bankCode: string): Promise<void>;
}

/**
 * Banks business logic. Sorting/filtering and existence/active validation live
 * here; the repository only performs data access.
 */
export class BanksServiceImpl implements BanksService {
  constructor(private readonly banksRepository: BanksRepository) {}

  /** Lists banks, optionally filtered, always sorted by name. */
  async listBanks(filter?: BanksFilter): Promise<BankRow[]> {
    const rows = filter?.activeOnly
      ? await this.banksRepository.listActive()
      : await this.banksRepository.findAll();

    const filtered = filter?.bankType
      ? rows.filter((row) => row.bank_type === filter.bankType)
      : rows;

    return sortBanksByName(filtered);
  }

  /** Convenience: all active banks, sorted by name. */
  async listActiveBanks(): Promise<BankRow[]> {
    return this.listBanks({ activeOnly: true });
  }

  /** Returns the bank or throws NotFoundError. */
  async findByBankCode(bankCode: string): Promise<BankRow> {
    const bank = await this.banksRepository.findByBankCode(bankCode);
    if (bank === null) {
      throw new NotFoundError(`Bank "${bankCode}" not found.`);
    }
    return bank;
  }

  /** Returns the ACTIVE bank or throws NotFoundError (inactive = not found). */
  async findActiveByBankCode(bankCode: string): Promise<BankRow> {
    const bank = await this.banksRepository.findActiveByBankCode(bankCode);
    if (bank === null) {
      throw new NotFoundError(`Bank "${bankCode}" not found.`);
    }
    return bank;
  }

  /** Throws NotFoundError when the bank does not exist. */
  async validateBankExists(bankCode: string): Promise<void> {
    await this.findByBankCode(bankCode);
  }

  /** Throws NotFoundError when absent, ValidationError when not active (null counts as inactive). */
  async validateBankActive(bankCode: string): Promise<void> {
    const bank = await this.findByBankCode(bankCode);
    if (bank.is_active !== true) {
      throw new ValidationError(`Bank "${bankCode}" is not active.`);
    }
  }
}
