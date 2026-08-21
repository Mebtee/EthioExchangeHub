/** Date/time helpers shared across the API. All timestamps are ISO-8601 UTC. */

/** Returns the current time as an ISO-8601 UTC string. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** ISO timestamp exactly one month after the given ISO time (UTC arithmetic). */
export function addOneMonthIso(iso: string): string {
  const date = new Date(iso);
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  ).toISOString();
}

/**
 * Today's date as "YYYY-MM-DD" in the SERVER'S LOCAL timezone.
 *
 * Deliberately not `toISOString().slice(0, 10)`: that returns the UTC date,
 * which is one day behind local time for UTC+3 (Ethiopia) between midnight
 * and 03:00. Rates are dated by local calendar day, so staleness must be
 * measured against the local date.
 */
export function todayLocalIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parses an ISO string safely; returns null when invalid. */
export function parseIso(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Formats an ISO string as a human-readable date (e.g. "Aug 1, 2026"). */
export function formatDate(iso: string, locale = "en-US"): string {
  const date = parseIso(iso);
  if (!date) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}

/** Formats an ISO string with time (e.g. "Aug 1, 2026, 10:30 AM"). */
export function formatDateTime(iso: string, locale = "en-US"): string {
  const date = parseIso(iso);
  if (!date) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/** True when the ISO timestamp is within the given number of milliseconds ago. */
export function isWithinLast(iso: string, withinMs: number): boolean {
  const date = parseIso(iso);
  if (!date) return false;
  return Date.now() - date.getTime() <= withinMs;
}
