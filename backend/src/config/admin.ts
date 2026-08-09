/**
 * Admin profile + settings configuration defaults.
 *
 * Server-side configuration (NOT controller-hardcoded values) used as the
 * fallback for keys that have no persisted row in the `settings` table. Once
 * a value is saved through `PUT /admin/settings` it is stored in the database
 * and wins over these defaults on every read.
 *
 * The admin PROFILE now comes from the authenticated `users` row (name, email,
 * role, real `created_at`/`last_login_at` timestamps) — not from this module.
 * The two profile fallbacks below exist only so the profile response fields
 * stay plain strings when a user row's timestamps are still unset.
 */

export const adminProfileDefaults = {
  memberSince: "2026-01-01",
  lastLogin: "2026-08-01T08:00:00.000Z",
} as const;

export const adminSettingsDefaults = {
  siteName: "Ethio Exchange Hub",
  defaultCurrency: "USD",
  refreshInterval: "15m",
  timezone: "Africa/Addis_Ababa",
  retentionDays: "30",
  emailAlerts: false,
  failureAlerts: false,
  dailyDigest: false,
  weeklyReport: false,
} as const;
