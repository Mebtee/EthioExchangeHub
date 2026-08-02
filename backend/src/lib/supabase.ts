import { createClient, type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/utils/validate-env";
import { DatabaseError } from "./errors";
import { logger } from "./logger";
import type { Database } from "@/types/database";

/**
 * Supabase connectivity layer.
 *
 * A single reusable client is created once at module load from the validated
 * environment (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY — both fail fast at
 * boot via `utils/validate-env.ts`). Server-side service-role usage never
 * stores or auto-refreshes user sessions, so both auth options are disabled.
 *
 * `verifyDatabaseConnection` performs the Phase 2A health check. Raw Supabase
 * errors are never exposed to clients: they are wrapped in `DatabaseError`
 * (or logged) so only sanitized details escape.
 */

/** Lazily-created singleton (created on first access to keep boot order explicit). */
let client: SupabaseClient<Database> | null = null;

/** Returns the shared, typed Supabase client, creating it on first use. */
export function getSupabase(): SupabaseClient<Database> {
  if (!client) {
    client = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return client;
}

/**
 * PostgREST error codes that mean "the database responded but the table does
 * not exist yet" — treated as a reachable database until the Phase 2B schema
 * migrations are applied.
 */
const MISSING_TABLE_CODES = new Set(["PGRST205", "42P01"]);

function isMissingTableError(error: Pick<PostgrestError, "code">): boolean {
  return MISSING_TABLE_CODES.has(error.code);
}

/**
 * Verifies the database is reachable by running a lightweight head query
 * against the `banks` table. The query is schema-agnostic (`select *`), so it
 * does not depend on any specific column.
 *
 * - A thrown network error (unreachable host, DNS, timeout) → false.
 * - A returned PostgREST error with real credentials → false, except a
 *   missing-table error, which still proves the database answered → true.
 *
 * The client is injectable for testability (defaults to the singleton).
 * This function never throws — failures are wrapped in `DatabaseError`,
 * logged, and surfaced as `false`.
 */
export async function verifyDatabaseConnection(
  supabase: SupabaseClient<Database> = getSupabase(),
): Promise<boolean> {
  try {
    const { error } = await supabase.from("banks").select("*", { count: "exact", head: true });

    if (error) {
      if (isMissingTableError(error)) {
        logger.warn("Database reachable, but schema is not migrated yet.", { code: error.code });
        return true;
      }
      throw error;
    }
    return true;
  } catch (err) {
    const wrapped =
      err instanceof DatabaseError ? err : new DatabaseError("Database connection failed.", err);
    // Log the sanitized underlying detail (server-side only) so failures are
    // diagnosable — clients only ever receive the generic envelope message.
    logger.error(wrapped.code, {
      error: wrapped.message,
      cause: err instanceof Error ? err.message : JSON.stringify(err),
    });
    return false;
  }
}
