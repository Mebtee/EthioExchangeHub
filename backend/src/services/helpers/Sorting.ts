/**
 * Shared sorting helpers. Services own ordering decisions (newest-first,
 * alphabetical, ...) — repositories only support the raw primitives.
 */

import type { BankRow } from "@/types/database";
import { compareIsoDates, type DatedRate } from "./RateResolution";

/** Sorts dated rows by `rate_date` (ascending when `ascending`, else newest first). */
export function sortByRateDate<T extends DatedRate>(rows: T[], ascending = false): T[] {
  return [...rows].sort((a, b) =>
    ascending
      ? compareIsoDates(a.rate_date, b.rate_date)
      : compareIsoDates(b.rate_date, a.rate_date),
  );
}

/** Sorts bank rows by `bank_name` (case-insensitive, alphabetical). */
export function sortBanksByName(rows: BankRow[]): BankRow[] {
  return [...rows].sort((a, b) => a.bank_name.localeCompare(b.bank_name));
}

/** Sorts rows by `bank_code` (alphabetical). */
export function sortByBankCode<T extends { bank_code: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.bank_code.localeCompare(b.bank_code));
}

/**
 * Sorts rate rows by `bank_code`, then `currency_code` — a deterministic
 * secondary order so results never depend on input/Map insertion order.
 */
export function sortByBankCodeAndCurrency<T extends { bank_code: string; currency_code: string }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const byBank = a.bank_code.localeCompare(b.bank_code);
    return byBank !== 0 ? byBank : a.currency_code.localeCompare(b.currency_code);
  });
}

/**
 * Sorts log rows newest-first by `ran_at` (null timestamps last), using `id`
 * as a stable tie-breaker. ISO-8601 timestamps compare lexicographically.
 */
export function sortLogsNewestFirst<T extends { ran_at: string | null; id: string }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    if (a.ran_at === null && b.ran_at === null) return b.id.localeCompare(a.id);
    if (a.ran_at === null) return 1;
    if (b.ran_at === null) return -1;
    const byTime = compareIsoDates(b.ran_at, a.ran_at);
    return byTime !== 0 ? byTime : b.id.localeCompare(a.id);
  });
}
