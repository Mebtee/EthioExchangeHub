/** Formatting helpers shared across the app. */

export function formatRelativeTime(iso: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "—";
  const diff = Math.max(0, Date.now() - time);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * Formats an ISO business date (YYYY-MM-DD) for public display — e.g.
 * "Aug 5, 2026". `rate_date` is the effective date of an exchange rate, so
 * public pages show this instead of scraper-relative times. Rendered
 * deterministically from the date part so it never depends on the runtime
 * timezone or locale.
 */
export function formatRateDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "—";
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

/** Relative time for a scheduled (future) or past timestamp. */
export function formatRelativeSchedule(iso: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "—";
  const diffMinutes = Math.floor((time - Date.now()) / 60000);
  if (diffMinutes > 0) {
    if (diffMinutes < 60) return `in ${diffMinutes} min`;
    const hours = Math.floor(diffMinutes / 60);
    if (hours < 24) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
    return `in ${Math.floor(hours / 24)} day${Math.floor(hours / 24) === 1 ? "" : "s"}`;
  }
  return formatRelativeTime(iso);
}

/** Four-decimal rate display used across ranking surfaces. */
export function formatRate(value: number): string {
  return value.toFixed(4);
}

/** Rate display that falls back to an em-dash for missing/invalid values. */
export function formatRateOrDash(value: number | undefined | null): string {
  return typeof value === "number" && Number.isFinite(value) ? formatRate(value) : "—";
}

/** Two-decimal fixed number with thousands separators. */
export function formatAmount(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Count display that falls back to an em-dash for zero/missing values. */
export function formatCountOrDash(value: number | undefined | null): string {
  return typeof value === "number" && value > 0 ? formatAmount(value) : "—";
}

/** Milliseconds rendered as seconds with one decimal, or an em-dash when empty. */
export function formatDurationMs(value: number | undefined | null): string {
  return typeof value === "number" && value > 0 ? `${(value / 1000).toFixed(1)}s` : "—";
}

/**
 * Renders large ETB figures compactly for card/snapshot surfaces — e.g.
 * 91_300_000_000 → "91.3B", 7_000_000_000 → "7B". Falls back to the plain
 * rounded integer below one thousand. Returns an em-dash for missing values.
 */
export function formatEtbCompact(value: number | undefined | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${trimTrailingZero((value / 1e12).toFixed(1))}T`;
  if (abs >= 1e9) return `${trimTrailingZero((value / 1e9).toFixed(1))}B`;
  if (abs >= 1e6) return `${trimTrailingZero((value / 1e6).toFixed(1))}M`;
  if (abs >= 1e3) return `${trimTrailingZero((value / 1e3).toFixed(1))}K`;
  return Math.round(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/** "7.0" → "7", "91.3" stays. */
function trimTrailingZero(fixed: string): string {
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
}

/** Renders a decimal ratio as a percentage — 0.0328 → "3.28%". Em-dash when missing. */
export function formatPercent(value: number | undefined | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(2)}%`;
}
