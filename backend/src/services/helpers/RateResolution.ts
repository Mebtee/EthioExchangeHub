/**
 * Shared rate-resolution helpers.
 *
 * The repositories return every matching row; deciding which row is "latest"
 * and resolving duplicates is business logic, so it lives here (and in the
 * services) — never in repositories.
 *
 * Rate rows carry an ISO `rate_date` ("YYYY-MM-DD"); those strings compare
 * lexicographically, but explicit helpers keep the intent readable.
 */

/** Type shared by every dated rate row. */
export type DatedRate = { rate_date: string };

/** Negative when `a` is before `b`, positive when after, zero when equal. */
export function compareIsoDates(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Duplicate resolution: groups rows by `key(row)` and keeps the newest
 * `rate_date` per group. Result order follows the input order (first
 * occurrence of each key), so callers should sort before/after as needed.
 */
export function resolveLatestPerKey<T extends DatedRate>(rows: T[], key: (row: T) => string): T[] {
  const latestByKey = new Map<string, T>();
  for (const row of rows) {
    const groupKey = key(row);
    const existing = latestByKey.get(groupKey);
    if (!existing || compareIsoDates(row.rate_date, existing.rate_date) > 0) {
      latestByKey.set(groupKey, row);
    }
  }
  return Array.from(latestByKey.values());
}

/**
 * Filters rows to an inclusive `rate_date` range. `from`/`to` are optional;
 * rows outside the range (or with an unparseable date) are dropped.
 */
export function filterByDateRange<T extends DatedRate>(
  rows: T[],
  range?: { from?: string; to?: string },
): T[] {
  const { from, to } = range ?? {};
  return rows.filter((row) => {
    if (from && row.rate_date < from) return false;
    if (to && row.rate_date > to) return false;
    return true;
  });
}
