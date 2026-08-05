import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";
import type { Database, UserRow } from "@/types/database";
import { BaseRepository } from "./BaseRepository";

/**
 * `users` repository — administrator accounts backing JWT auth (A1).
 *
 * Query-only data access: email lookup (login), id lookup (token verify),
 * and a safe password/avatar update. Hashing and token logic live in the
 * service layer, never here.
 */
export class UsersRepository extends BaseRepository<"users"> {
  constructor(client: SupabaseClient<Database> = getSupabase()) {
    super(client, "users");
  }

  /** Finds a user by email, or null when absent. */
  findByEmail(email: string): Promise<UserRow | null> {
    return super.findOneBy({ email });
  }

  /** Finds a user by id, or null when absent. */
  findById(id: string): Promise<UserRow | null> {
    return super.findOneBy({ id });
  }
}
