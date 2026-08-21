import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";
import type { BankPaymentConfigRow, Database } from "@/types/database";
import { BaseRepository, type QueryResult } from "./BaseRepository";

/**
 * `bank_payment_config` repository — bank accounts shown to customers for
 * manual transfers (Phase 3). Customers read ACTIVE rows only; admins manage
 * the full set. There is deliberately no customer-facing mutation here.
 */
export class BankPaymentConfigRepository extends BaseRepository<"bank_payment_config"> {
  constructor(client: SupabaseClient<Database> = getSupabase()) {
    super(client, "bank_payment_config");
  }

  /** One config row by id. */
  findById(id: string): Promise<BankPaymentConfigRow | null> {
    return this.findOneBy({ id });
  }

  /** ACTIVE accounts only, in a stable order (customer view). */
  async findActiveOrdered(): Promise<BankPaymentConfigRow[]> {
    const query = this.client
      .from(this.table)
      .select()
      .eq("is_active", true)
      .order("bank_name", { ascending: true })
      .order("id", { ascending: true });
    const { data, error } = (await query) as unknown as QueryResult<BankPaymentConfigRow[]>;
    this.throwIfError(error, "findActiveOrdered");
    return data ?? [];
  }

  /** ALL accounts including inactive ones, newest first (admin view). */
  async findAllOrdered(): Promise<BankPaymentConfigRow[]> {
    const query = this.client.from(this.table).select().order("created_at", { ascending: false });
    const { data, error } = (await query) as unknown as QueryResult<BankPaymentConfigRow[]>;
    this.throwIfError(error, "findAllOrdered");
    return data ?? [];
  }
}
