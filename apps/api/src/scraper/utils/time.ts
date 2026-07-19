/**
 * Returns the time until the next scheduled run (daily at 08:30 EAT).
 * EAT is UTC+3, so 08:30 EAT = 05:30 UTC.
 */
export function getMsUntilNextScheduledRun(hour = 8, minute = 30): number {
  const now = new Date();
  const target = new Date(now);
  target.setUTCHours(hour - 3, minute, 0, 0); // EAT is UTC+3

  if (target.getTime() <= now.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }

  return target.getTime() - now.getTime();
}

/**
 * Format duration in ms to human-readable string.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

/**
 * Get current time in Addis Ababa (EAT) timezone.
 */
export function nowEAT(): Date {
  const now = new Date();
  // EAT is UTC+3, no daylight saving
  const eatOffset = 3 * 60;
  const localOffset = now.getTimezoneOffset();
  return new Date(now.getTime() + (localOffset + eatOffset) * 60_000);
}

/**
 * Format a date to "YYYY-MM-DD HH:mm:ss EAT" string.
 */
export function formatEAT(date: Date): string {
  return date.toLocaleString('en-ET', {
    timeZone: 'Africa/Addis_Ababa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
