import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { DatabaseError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { Database, DatabaseTables } from "@/types/database";

/**
 * Generic base repository (realigned to the live schema, Phase 2C).
 *
 * Every table repository extends this class, so the standard data-access
 * surface is implemented once (DRY) and each repository only binds its table
 * name and adds table-specific queries.
 *
 * The live tables have NO uniform primary key: `banks` and `scraper_health`
 * have no `id` column at all, and the id columns that exist are UUIDs. The
 * base therefore exposes *filter-based* operations (`findOneBy`,
 * `findManyBy`, `findLatestBy`, `updateBy`, `deleteBy`) keyed on natural
 * columns (e.g. `bank_code`) instead of assuming a numeric `id`. These are
 * the public data-access primitives used by services and by each table's
 * convenience methods.
 *
 * Repositories are the ONLY layer allowed to touch the database. They perform
 * queries/mutations and return strongly typed rows; they never apply business
 * rules, joins, or HTTP concerns. The shared Supabase client is injected via
 * the constructor (never instantiated here).
 *
 * All Supabase errors are wrapped in `DatabaseError` (existing custom error
 * class) and the raw detail is logged server-side only — clients only ever
 * receive the sanitized message through the error middleware.
 *
 * NOTE on casts: postgrest-js derives its query types from *concrete* table
 * names, so its deeply conditional types don't reduce for a generic `T`.
 * This class keeps the client's fluent chain but asserts the terminal result
 * into the typed row shape at the single await boundary (`as unknown as`,
 * never `any`) and asserts columns/payloads where postgrest can't prove them
 * (`as never`). Callers still receive fully typed rows; concrete subclasses
 * express their queries as typed partial rows and need no casts at all.
 */

export type TableName = keyof DatabaseTables;

/** Row type of a given table (the typed domain model returned by queries). */
export type RowOf<T extends TableName> = DatabaseTables[T]["Row"];
/** Insert payload type of a given table. */
export type InsertOf<T extends TableName> = DatabaseTables[T]["Insert"];
/** Update payload type of a given table. */
export type UpdateOf<T extends TableName> = DatabaseTables[T]["Update"];

/** A query result before unwrapping: typed rows plus the raw PostgREST error. */
type QueryResult<T> = { data: T | null; error: PostgrestError | null };

export interface FindAllOptions<T extends TableName> {
  /** Maximum number of rows to return. */
  limit?: number;
  /** Column to order by (natural order when omitted). */
  orderBy?: string & keyof RowOf<T>;
  /** Sort direction, used only when `orderBy` is set. Defaults to ascending. */
  ascending?: boolean;
}

export abstract class BaseRepository<T extends TableName> {
  protected readonly client: SupabaseClient<Database>;
  protected readonly table: T;

  constructor(client: SupabaseClient<Database>, table: T) {
    this.client = client;
    this.table = table;
  }

  /** Returns all rows for the table, optionally limited/sorted. */
  async findAll(options?: FindAllOptions<T>): Promise<RowOf<T>[]> {
    let query = this.client.from(this.table).select();
    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? true });
    }
    if (options?.limit !== undefined) {
      query = query.limit(options.limit);
    }
    const { data, error } = (await query) as unknown as QueryResult<RowOf<T>[]>;
    this.throwIfError(error, "findAll");
    return data ?? [];
  }

  /** Inserts a row and returns the created record. */
  async insert(payload: InsertOf<T>): Promise<RowOf<T>> {
    // postgrest-js's Insert type machinery cannot reduce for a generic `T`;
    // the payload is already validated against `InsertOf<T>` at this public
    // boundary, so only the fluent call needs the assertion.
    const { data, error } = (await this.client
      .from(this.table)
      .insert(payload as never)
      .select()
      .maybeSingle()) as unknown as QueryResult<RowOf<T>>;
    this.throwIfError(error, "insert");
    if (data === null) {
      throw new DatabaseError(`Insert into ${this.table} returned no row.`);
    }
    return data;
  } /**
   * Finds the first row matching all given column filters, or null when absent.
   * Column names are validated against the table's row type (`Partial<RowOf<T>>`).
   */
  async findOneBy(where: Partial<RowOf<T>>): Promise<RowOf<T> | null> {
    const query = this.applyEqFilters(this.client.from(this.table).select(), where);
    const { data, error } = (await query.maybeSingle()) as unknown as QueryResult<RowOf<T>>;
    this.throwIfError(error, `findOneBy:${Object.keys(where).join(",")}`);
    return data;
  }

  /** Finds all rows matching all given column filters. */
  async findManyBy(where: Partial<RowOf<T>>): Promise<RowOf<T>[]> {
    const query = this.applyEqFilters(this.client.from(this.table).select(), where);
    const { data, error } = (await query) as unknown as QueryResult<RowOf<T>[]>;
    this.throwIfError(error, `findManyBy:${Object.keys(where).join(",")}`);
    return data ?? [];
  }

  /**
   * Finds the most recent row matching the filters, ordered by the given
   * column descending (e.g. `rate_date`). `tieBreaker` adds a stable secondary
   * sort (e.g. `id`) so a same-value collision on `orderBy` cannot make
   * `maybeSingle()` reject. Returns null when none match.
   */
  async findLatestBy(
    where: Partial<RowOf<T>>,
    orderBy: string & keyof RowOf<T>,
    tieBreaker?: string & keyof RowOf<T>,
  ): Promise<RowOf<T> | null> {
    let query = this.applyEqFilters(this.client.from(this.table).select(), where).order(orderBy, {
      ascending: false,
    });
    if (tieBreaker) {
      query = query.order(tieBreaker, { ascending: false });
    }
    const { data, error } = (await query.limit(1).maybeSingle()) as unknown as QueryResult<
      RowOf<T>
    >;
    this.throwIfError(error, `findLatestBy:${Object.keys(where).join(",")}`);
    return data;
  }

  /**
   * Updates all rows matching the filters and returns the first updated row,
   * or null when nothing matched. Callers should filter to at most one row.
   */
  async updateBy(where: Partial<RowOf<T>>, payload: UpdateOf<T>): Promise<RowOf<T> | null> {
    // Same generic-T limitation as `insert`; payload is typed as `UpdateOf<T>`.
    const query = this.applyEqFilters(this.client.from(this.table).update(payload as never), where);
    const { data, error } = (await query.select().maybeSingle()) as unknown as QueryResult<
      RowOf<T>
    >;
    this.throwIfError(error, `updateBy:${Object.keys(where).join(",")}`);
    return data;
  }

  /** Deletes all rows matching the filters; true when at least one was removed. */
  async deleteBy(where: Partial<RowOf<T>>): Promise<boolean> {
    const query = this.applyEqFilters(this.client.from(this.table).delete(), where);
    const { data, error } = (await query.select()) as unknown as QueryResult<RowOf<T>[]>;
    this.throwIfError(error, `deleteBy:${Object.keys(where).join(",")}`);
    return (data ?? []).length > 0;
  }

  /**
   * Applies `column = value` filters to a fluent query builder (DRY — used by
   * every filtered operation). The structural constraint keeps the helper
   * generic without touching supabase-js's opaque conditional types; the
   * column/value assertions are centralized here instead of repeated.
   */
  private applyEqFilters<B extends { eq: (column: never, value: never) => B }>(
    query: B,
    where: Partial<RowOf<T>>,
  ): B {
    let result = query;
    for (const [column, value] of Object.entries(where)) {
      result = result.eq(column as never, value as never);
    }
    return result;
  }

  /**
   * Guards every Supabase call: wraps the returned PostgREST error in
   * `DatabaseError` (never leaking the raw response to clients) and logs the
   * sanitized detail server-side for diagnosis. The raw PostgREST error is
   * logged rather than passed as a `cause` because `DatabaseError` only retains
   * `Error` instances, and PostgREST errors are plain objects.
   */
  protected throwIfError(error: PostgrestError | null, operation: string): void {
    if (error) {
      logger.error("DATABASE_ERROR", {
        operation,
        table: this.table,
        code: error.code,
        detail: error.message,
      });
      throw new DatabaseError(`${operation} failed on ${this.table}.`);
    }
  }
}
