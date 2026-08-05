import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";
import type { BankRow, Database } from "@/types/database";
import { BaseRepository } from "./BaseRepository";
import { sortBanksByName } from "@/services/helpers/Sorting";

/**
 * `banks` repository (realigned to the live schema, Phase 2C).
 *
 * The table has no numeric id — `bank_code` is the natural key.
 * Standard access is inherited from `BaseRepository`; this class binds the
 * table name and adds bank-specific queries. Query-only — no business rules.
 *
 * The repository never fabricates data: an empty table returns an empty
 * array, a missing bank returns null, and query failures throw `DatabaseError`.
 */
export class BanksRepository extends BaseRepository<"banks"> {
  constructor(client: SupabaseClient<Database> = getSupabase()) {
    super(client, "banks");
  }

  /** Finds a bank by its natural key. */
  findByBankCode(bankCode: string): Promise<BankRow | null> {
    return super.findOneBy({ bank_code: bankCode });
  }

  /** Lists banks currently flagged active, sorted by name. */
  async listActive(): Promise<BankRow[]> {
    const rows = await super.findManyBy({ is_active: true });
    return sortBanksByName(rows);
  }
}
