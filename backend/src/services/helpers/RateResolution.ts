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

/** A dated row that also exposes its origin (scraped vs manual override). */
export type ResolvableRate = DatedRate & {
  /** Stable row id — final tie-breaker (e.g. UUID). */
  id?: string;
  source: string | null;
  /** Scrape timestamp — freshness metadata, used only as a same-date tie-break. */
  scraped_at?: string | null;
};

/** True when the row originated from a manual override entry. */
export function isManualSource(source: string | null): boolean {
  return source?.trim().toUpperCase() === "MANUAL";
}

/**
 * Manual-override-aware resolution: groups rows by `key(row)` and keeps the
 * newest `rate_date` per group. A tie on `rate_date` is broken by, in order:
 *   1. a manual override beats a scraped row;
 *   2. same source → the newest `scraped_at` wins (freshness metadata is used
 *      ONLY here, as a same-date tie-break — never as the primary date);
 *   3. still tied → the newest row `id` wins (stable final fallback).
 * Scraped and manual rows share the same shape, so the result is a
 * homogeneous list — the winner simply keeps its `source`. Result order
 * follows the input order; callers sort as needed.
 */
export function resolveLatestWithManualOverrides<T extends ResolvableRate>(
  rows: T[],
  key: (row: T) => string,
): T[] {
  const latestByKey = new Map<string, T>();
  for (const row of rows) {
    const groupKey = key(row);
    const existing = latestByKey.get(groupKey);
    if (!existing) {
      latestByKey.set(groupKey, row);
      continue;
    }
    if (isNewerThan(row, existing)) {
      latestByKey.set(groupKey, row);
    }
  }
  return Array.from(latestByKey.values());
}

/**
 * True when `candidate` should replace `current` for the same group key.
 * `rate_date` is the source of truth; `source`, `scraped_at`, and `id` only
 * decide among rows that share the newest `rate_date`.
 */
function isNewerThan<T extends ResolvableRate>(candidate: T, current: T): boolean {
  const byDate = compareIsoDates(candidate.rate_date, current.rate_date);
  if (byDate !== 0) return byDate > 0;

  const candidateManual = isManualSource(candidate.source);
  const currentManual = isManualSource(current.source);
  if (candidateManual !== currentManual) return candidateManual;

  // Same source on the same rate_date — the newest scrape wins.
  const candidateScrapedAt = candidate.scraped_at ?? null;
  const currentScrapedAt = current.scraped_at ?? null;
  if (candidateScrapedAt !== currentScrapedAt) {
    if (candidateScrapedAt === null) return false;
    if (currentScrapedAt === null) return true;
    return candidateScrapedAt > currentScrapedAt;
  }

  // Still tied — the newest row id wins (stable final fallback).
  return (candidate.id ?? "") > (current.id ?? "");
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

/**
 * Default staleness window in days. KEEP IN SYNC with the `MAX_RATE_AGE_DAYS`
 * default in `backend/src/config/env.ts` — services use this fallback only
 * when the composition root does not inject the configured env value.
 */
export const DEFAULT_MAX_RATE_AGE_DAYS = 7;

/**
 * The staleness cutoff date ("YYYY-MM-DD"): `maxAgeDays` days before `today`.
 * Hoisted out of `isStaleRate`/`markStale` so the Date arithmetic runs once
 * per call, not once per row.
 */
function staleCutoffIso(today: string, maxAgeDays: number): string {
  if (maxAgeDays <= 0) return today;
  const cutoff = new Date(`${today}T00:00:00.000Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - maxAgeDays);
  return cutoff.toISOString().slice(0, 10);
}

/**
 * Staleness policy (D2): a dated row is stale when its `rate_date` is older
 * than `maxAgeDays` before `today` (both "YYYY-MM-DD"). The boundary day is
 * INCLUSIVE — a rate dated exactly `maxAgeDays` ago is still fresh
 * (`rateDate < cutoff`); only strictly older dates are stale. `0`/negative
 * disables staleness. Staleness is measured against `rate_date` (the
 * effective rate date), not `scraped_at` — a re-published rate is judged by
 * the date it is valid for, so a bank that stopped publishing naturally ages
 * out. Pure and deterministic: `today` is injected so tests never read the
 * wall clock.
 */
export function isStaleRate(rateDate: string, today: string, maxAgeDays: number): boolean {
  if (maxAgeDays <= 0) return false;
  return rateDate < staleCutoffIso(today, maxAgeDays);
}

/** A dated row annotated with its computed staleness flag. */
export type StaleMarked<T extends DatedRate> = T & { stale: boolean };

/**
 * Annotates every row with `stale` per the configured age window. Stale rows
 * are NEVER dropped here — the flag is additive so callers decide how to
 * treat them (hero may exclude, rankings may badge).
 */
export function markStale<T extends DatedRate>(
  rows: T[],
  today: string,
  maxAgeDays: number,
): StaleMarked<T>[] {
  const cutoff = staleCutoffIso(today, maxAgeDays);
  return rows.map((row) => ({ ...row, stale: maxAgeDays > 0 && row.rate_date < cutoff }));
}
