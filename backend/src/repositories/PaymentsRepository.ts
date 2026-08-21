import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";
import type { Database, PaymentRow } from "@/types/database";
import { BaseRepository, type QueryResult } from "./BaseRepository";

/**
 * `payments` repository — manual bank-transfer payment records (Phase 3).
 *
 * Business rules (eligibility, duplicate protection, activation) live in the
 * services. Isolation helpers (`findByIdAndCustomer`) keep customer-scoped
 * access structural; admin reads may use unscoped lookups deliberately.
 */
export class PaymentsRepository extends BaseRepository<"payments"> {
  constructor(client: SupabaseClient<Database> = getSupabase()) {
    super(client, "payments");
  }

  /** One payment by id (any customer — callers MUST enforce isolation). */
  findById(id: string): Promise<PaymentRow | null> {
    return this.findOneBy({ id });
  }

  /**
   * Finds one payment owned by exactly this customer (isolation filter), or
   * null — the ONLY lookup customer flows may use.
   */
  findByIdAndCustomer(id: string, customerId: string): Promise<PaymentRow | null> {
    return this.findOneBy({ id, customer_id: customerId });
  }

  /** Lists one customer's payments, newest first. */
  async findByCustomer(customerId: string): Promise<PaymentRow[]> {
    const query = this.client
      .from(this.table)
      .select()
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    const { data, error } = (await query) as unknown as QueryResult<PaymentRow[]>;
    this.throwIfError(error, "findByCustomer");
    return data ?? [];
  }

  /** All payments for one subscription, newest first (duplicate checks). */
  async findBySubscription(subscriptionId: string): Promise<PaymentRow[]> {
    const query = this.client
      .from(this.table)
      .select()
      .eq("subscription_id", subscriptionId)
      .order("created_at", { ascending: false });
    const { data, error } = (await query) as unknown as QueryResult<PaymentRow[]>;
    this.throwIfError(error, "findBySubscription");
    return data ?? [];
  }

  /** All payments, newest first; optionally filtered by status (admin list). */
  async findAllOrdered(status?: string): Promise<PaymentRow[]> {
    let query = this.client
      .from(this.table)
      .select()
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (status !== undefined) query = query.eq("status", status);
    const { data, error } = (await query.limit(200)) as unknown as QueryResult<PaymentRow[]>;
    this.throwIfError(error, "findAllOrdered");
    return data ?? [];
  }

  /**
   * Duplicate-reference check: whether this customer already used the bank
   * transaction reference on any payment (any status).
   */
  async customerRefExists(customerId: string, ref: string): Promise<boolean> {
    const rows = await this.findManyBy({
      customer_id: customerId,
      customer_transaction_ref: ref,
    });
    return rows.length > 0;
  }
}
