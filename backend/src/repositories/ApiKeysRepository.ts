import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";
import type { ApiKeyRow, Database } from "@/types/database";
import { BaseRepository, type QueryResult, type UpdateOf } from "./BaseRepository";

/**
 * `api_keys` repository — customer API access keys (Phase 2B).
 *
 * The full key secret NEVER reaches this layer: callers persist `key_prefix`
 * (public identifier) and `key_hash` (SHA-256 of the complete key) only.
 * Every method is customer-scoped by design so cross-customer access is
 * structurally impossible; the service resolves the owning `customers.id`
 * from the authenticated JWT subject before calling any of these.
 */
export class ApiKeysRepository extends BaseRepository<"api_keys"> {
  constructor(client: SupabaseClient<Database> = getSupabase()) {
    super(client, "api_keys");
  }

  /** Lists one customer's keys, newest first. */
  async findByCustomer(customerId: string): Promise<ApiKeyRow[]> {
    const query = this.client
      .from(this.table)
      .select()
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    const { data, error } = (await query) as unknown as QueryResult<ApiKeyRow[]>;
    this.throwIfError(error, "findByCustomer");
    return data ?? [];
  }

  /** Finds one key owned by exactly this customer (isolation filter), or null. */
  findByIdAndCustomer(id: string, customerId: string): Promise<ApiKeyRow | null> {
    return this.findOneBy({ id, customer_id: customerId });
  }

  /**
   * Commercial-API lookup (Phase 4): all non-revoked-candidate rows sharing a
   * key prefix. Prefix collisions are expected to be rare (8 secret chars of
   * base64url), so callers verify the full hash with `verifyApiKey` — the
   * digest never appears in a WHERE clause, and verification is constant
   * time. Returns every match; an empty array when none.
   */
  findAllByPrefix(keyPrefix: string): Promise<ApiKeyRow[]> {
    return this.findManyBy({ key_prefix: keyPrefix });
  }

  /**
   * Best-effort `last_used_at` stamp for successful commercial requests.
   * Returns the updated row, or null when the key vanished mid-request.
   */
  touchLastUsed(id: string, timestamp: string): Promise<ApiKeyRow | null> {
    return this.updateBy({ id }, {
      last_used_at: timestamp,
      updated_at: timestamp,
    } as UpdateOf<"api_keys">);
  }

  /**
   * Secure revocation: stamps `revoked_at`/`updated_at` on the key only when
   * it belongs to the given customer. Returns the updated row, or null when
   * no matching owned key exists.
   */
  revokeByIdAndCustomer(
    id: string,
    customerId: string,
    revokedAt: string,
  ): Promise<ApiKeyRow | null> {
    return this.updateBy({ id, customer_id: customerId }, {
      revoked_at: revokedAt,
      updated_at: revokedAt,
    } as UpdateOf<"api_keys">);
  }
}
