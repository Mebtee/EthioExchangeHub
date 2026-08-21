import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";
import type { CustomerRow, Database } from "@/types/database";
import { BaseRepository } from "./BaseRepository";

/**
 * `customers` repository — commercial-customer profiles (Phase 2A).
 *
 * One-to-one extension of `users` via the unique `user_id` FK. Registration
 * inserts the profile row right after the `users` row is created; reads and
 * updates belong to later phases, so only the inherited base operations are
 * exposed for now.
 */
export class CustomersRepository extends BaseRepository<"customers"> {
  constructor(client: SupabaseClient<Database> = getSupabase()) {
    super(client, "customers");
  }

  /** Resolves the one-to-one profile row for a `users.id`, or null. */
  findByUserId(userId: string): Promise<CustomerRow | null> {
    return this.findOneBy({ user_id: userId });
  }
}
