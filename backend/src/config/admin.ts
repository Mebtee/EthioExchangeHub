/**
 * Admin profile + settings configuration defaults.
 *
 * Server-side configuration (NOT controller-hardcoded values) used as the
 * fallback for keys that have no persisted row in the `settings` table. Once
 * a value is saved through `PUT /admin/profile` or `PUT /admin/settings` it
 * is stored in the database and wins over these defaults on every read.
 *
 * The profile is deliberately a *single configurable administrator* until
 * authentication ships; when JWT auth lands these fields should come from the
 * authenticated session instead of this module.
 *
 * NOTE: `memberSince`/`lastLogin` defaults are display placeholders — there is
 * no auth to record real values yet. They are configurable here (or persisted
 * via the `settings` table) and will be superseded by session data.
 */

export const adminProfileDefaults = {
  name: "Administrator",
  email: "admin@ethioexchangehub.com",
  role: "Administrator",
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
