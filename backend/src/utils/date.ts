/** Date/time helpers shared across the API. All timestamps are ISO-8601 UTC. */

/** Returns the current time as an ISO-8601 UTC string. */
export function nowIso(): string {
  return new Date().toISOString();
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
