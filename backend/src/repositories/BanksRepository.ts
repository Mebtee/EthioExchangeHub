import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";
import type { BankRow, Database } from "@/types/database";
import { demoBanks } from "@/data/public-demo";
import { BaseRepository } from "./BaseRepository";
import { sortBanksByName } from "@/services/helpers/Sorting";

/**
 * `banks` repository (realigned to the live schema, Phase 2C).
 *
 * The table has no numeric id — `bank_code` is the natural key.
 * Standard access is inherited from `BaseRepository`; this class binds the
 * table name and adds bank-specific queries. Query-only — no business rules.
 */
export class BanksRepository extends BaseRepository<"banks"> {
  constructor(client: SupabaseClient<Database> = getSupabase()) {
    super(client, "banks");
  }

  override async findAll(): Promise<BankRow[]> {
    const rows = await super.findAll();
    return rows.length > 0 ? rows : sortBanksByName(demoBanks);
  }

  /** Finds a bank by its natural key. */
  findByBankCode(bankCode: string): Promise<BankRow | null> {
    return super.findOneBy({ bank_code: bankCode }).then((row) => {
      if (row) return row;
      return demoBanks.find((bank) => bank.bank_code === bankCode) ?? null;
    });
  }

  /** Lists banks currently flagged active. */
  async listActive(): Promise<BankRow[]> {
    const rows = await super.findManyBy({ is_active: true });
    return rows.length > 0 ? sortBanksByName(rows) : sortBanksByName(demoBanks.filter((bank) => bank.is_active === true));
  }
}
