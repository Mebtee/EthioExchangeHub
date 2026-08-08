import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";
import type { ContactMessageRow, Database } from "@/types/database";
import { BaseRepository } from "./BaseRepository";

/**
 * `contact_messages` repository — public Contact page submissions.
 *
 * Write-only: messages are immutable once stored (no update/delete surface in
 * the API). Inserts rely on the base `insert` (id + created_at come from the
 * database defaults).
 */
export class ContactRepository extends BaseRepository<"contact_messages"> {
  constructor(client: SupabaseClient<Database> = getSupabase()) {
    super(client, "contact_messages");
  }

  /** Persists a contact message and returns the stored row. */
  createMessage(input: {
    name: string;
    email: string;
    subject: string;
    message: string;
    created_at: string;
  }): Promise<ContactMessageRow> {
    return this.insert(input);
  }
}
