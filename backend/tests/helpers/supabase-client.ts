/**
 * In-memory fake Supabase client.
 *
 * Implements exactly the fluent surface the repositories use
 * (`select`/`eq`/`order`/`limit`/`maybeSingle`/`insert`/`update`/`delete`)
 * against seed data, so repository, service, controller, and integration
 * tests never touch a real database. Raw fixture rows are deep-copied per
 * client so tests never share mutable state.
 *
 * Error simulation: set `client.nextError` to a fake PostgREST error; the
 * NEXT executed query resolves `{ data: null, error }` and the flag clears
 * (mirrors one-shot error injection for 500-path tests).
 */

import { randomUUID } from "node:crypto";

/** Minimal PostgREST error shape. */
export interface FakePostgrestError {
  code: string;
  message: string;
  details?: string;
  hint?: string;
}

/** Seed tables: table name -> rows. */
export type FakeSeed = Record<string, Array<Record<string, unknown>>>;

interface OpState {
  table: string;
  filters: Array<[string, unknown]>;
  orders: Array<[string, boolean]>;
  limit?: number;
  /** Inclusive window `[from, to]` — mirrors PostgREST's `Range` header. */
  range?: [number, number];
  single?: boolean;
  selectColumns?: string;
  head?: boolean;
  count?: "exact";
  insertPayload?: Record<string, unknown>;
  updatePayload?: Record<string, unknown>;
  deleteFlag?: boolean;
}

/** A thenable query builder executing against the parent client's tables. */
class FakeBuilder {
  constructor(
    private readonly client: FakeSupabaseClient,
    private readonly state: OpState,
  ) {}

  select(columns?: string, options?: { count?: "exact"; head?: boolean }): this {
    this.state.selectColumns = columns;
    this.state.head = options?.head ?? false;
    this.state.count = options?.count;
    this.client.lastSelect = columns ?? null;
    return this;
  }

  eq(column: string, value: unknown): this {
    this.state.filters.push([column, value]);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.state.orders.push([column, options?.ascending ?? true]);
    return this;
  }

  limit(count: number): this {
    this.state.limit = count;
    return this;
  }

  range(from: number, to: number): this {
    this.state.range = [from, to];
    return this;
  }

  insert(payload: Record<string, unknown>): this {
    this.state.insertPayload = payload;
    return this;
  }

  update(payload: Record<string, unknown>): this {
    this.state.updatePayload = payload;
    return this;
  }

  delete(): this {
    this.state.deleteFlag = true;
    return this;
  }

  maybeSingle(): this {
    this.state.single = true;
    return this;
  }

  then<TResult1 = unknown, TResult2 = never>(
    onFulfilled?: (value: { data: unknown; error: FakePostgrestError | null }) => TResult1,
    onRejected?: (reason: unknown) => TResult2,
  ): PromiseLike<TResult1 | TResult2> {
    let result: { data: unknown; error: FakePostgrestError | null };
    try {
      result = this.execute();
    } catch (err) {
      if (onRejected) return Promise.resolve(onRejected(err));
      return Promise.reject(err);
    }
    return Promise.resolve(onFulfilled ? onFulfilled(result) : (result as TResult1));
  }

  private execute(): { data: unknown; error: FakePostgrestError | null } {
    const client = this.client;
    if (client.nextError) {
      const error = client.nextError;
      client.nextError = null;
      return { data: null, error };
    }

    const { state } = this;
    const rows = client.tables.get(state.table) ?? [];
    const matches = (row: Record<string, unknown>): boolean =>
      state.filters.every(([column, value]) => row[column] === value);

    if (state.insertPayload) {
      const payload = { ...state.insertPayload };
      // Every table in this schema has a UUID primary key with a database
      // default — mirror that by generating an id whenever the payload omits
      // one (including inserts into an empty table).
      if (payload.id === undefined) {
        payload.id = randomUUID();
      }
      const created = { ...payload };
      rows.push(created);
      return { data: created, error: null };
    }

    const matched = rows.filter(matches);

    // Head + exact count (PostgREST: `select(columns, { count: "exact", head: true })`).
    if (state.head) {
      return { data: null, count: matched.length, error: null };
    }

    if (state.updatePayload) {
      for (const row of matched) {
        Object.assign(row, state.updatePayload);
      }
      return { data: matched[0] ?? null, error: null };
    }

    if (state.deleteFlag) {
      const deleted = [...matched];
      client.tables.set(
        state.table,
        rows.filter((row) => !matched.includes(row)),
      );
      return { data: deleted, error: null };
    }

    let selected = matched;
    // PostgREST treats the FIRST `order` as primary and later ones as
    // tie-breakers; emulate that by applying the orders in reverse with
    // stable sorts, so earlier orders dominate.
    for (const [column, ascending] of [...state.orders].reverse()) {
      selected = [...selected].sort((a, b) => {
        const left = a[column];
        const right = b[column];
        const compared = left === right ? 0 : left < right ? -1 : 1;
        return ascending ? compared : -compared;
      });
    }
    if (state.limit !== undefined) {
      selected = selected.slice(0, state.limit);
    }
    if (state.range !== undefined) {
      const [from, to] = state.range;
      selected = selected.slice(from, to + 1);
    }
    return { data: state.single ? (selected[0] ?? null) : selected, error: null };
  }
}

/** In-memory Supabase client. Cast to `SupabaseClient<Database>` at usage. */
export class FakeSupabaseClient {
  /** Tables: table name -> mutable row arrays (deep-copied from the seed). */
  readonly tables: Map<string, Array<Record<string, unknown>>>;

  /** When set, the next executed query fails with this error (one-shot). */
  nextError: FakePostgrestError | null = null;

  /** Columns from the most recent `select(...)` call (for regression pins). */
  lastSelect: string | null = null;

  constructor(seed: FakeSeed = {}) {
    this.tables = new Map(
      Object.entries(seed).map(([name, rows]) => [name, rows.map((row) => ({ ...row }))]),
    );
  }

  /** Starts a query on a table (mimics `supabase.from(table)`). */
  from(table: string): FakeBuilder {
    return new FakeBuilder(this, { table, filters: [], orders: [] });
  }
}

/** Deep-copy helper so seeds are never mutated across tests. */
export function createFakeSupabaseClient(seed: FakeSeed = {}): FakeSupabaseClient {
  return new FakeSupabaseClient(seed);
}
