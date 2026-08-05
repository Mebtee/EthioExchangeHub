import { adminProfileDefaults, adminSettingsDefaults } from "@/config/admin";
import type { SettingEntry } from "@/repositories/SettingsRepository";
import { SettingsRepository } from "@/repositories/SettingsRepository";

/** Admin profile as served by `GET /admin/profile`. */
export interface AdminProfileData {
  name: string;
  email: string;
  role: string;
  initials: string;
  memberSince: string;
  lastLogin: string;
}

/** Admin settings as served by `GET /admin/settings`. */
export interface AdminSettingsData {
  siteName: string;
  defaultCurrency: string;
  refreshInterval: string;
  timezone: string;
  retentionDays: string;
  emailAlerts: boolean;
  failureAlerts: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
}

/** Editable profile fields (`PUT /admin/profile`) — any subset. */
export interface AdminProfileInput {
  name?: string;
  email?: string;
  role?: string;
}

/** Editable settings fields (`PUT /admin/settings`) — any subset. */
export interface AdminSettingsInput {
  siteName?: string;
  defaultCurrency?: string;
  refreshInterval?: string;
  timezone?: string;
  retentionDays?: string;
  emailAlerts?: boolean;
  failureAlerts?: boolean;
  dailyDigest?: boolean;
  weeklyReport?: boolean;
}

/** Public contract of the settings service. */
export interface SettingsService {
  getProfile(): Promise<AdminProfileData>;
  updateProfile(input: AdminProfileInput): Promise<AdminProfileData>;
  getSettings(): Promise<AdminSettingsData>;
  updateSettings(input: AdminSettingsInput): Promise<AdminSettingsData>;
}

/** Maps profile response fields to their `settings` table keys. */
const PROFILE_KEY_TO_FIELD: Record<string, keyof AdminProfileData> = {
  admin_name: "name",
  admin_email: "email",
  admin_role: "role",
  admin_member_since: "memberSince",
  admin_last_login: "lastLogin",
};

/** Maps settings response fields to their `settings` table keys. */
const SETTING_KEY_TO_FIELD: Record<string, keyof AdminSettingsData> = {
  site_name: "siteName",
  default_currency: "defaultCurrency",
  refresh_interval: "refreshInterval",
  timezone: "timezone",
  retention_days: "retentionDays",
  email_alerts: "emailAlerts",
  failure_alerts: "failureAlerts",
  daily_digest: "dailyDigest",
  weekly_report: "weeklyReport",
};

/** Maps a boolean field name to its `settings` table key. */
const BOOLEAN_SETTING_KEY: Record<string, string> = {
  emailAlerts: "email_alerts",
  failureAlerts: "failure_alerts",
  dailyDigest: "daily_digest",
  weeklyReport: "weekly_report",
};

/**
 * Admin profile/settings business logic.
 *
 * Reads merge persisted `settings` rows over the configured defaults in
 * `config/admin.ts` — a persisted value always wins, nothing is fabricated.
 * Writes persist exactly the provided fields (updates are real DB writes,
 * never simulated) and re-read so the response reflects stored state.
 */
export class SettingsServiceImpl implements SettingsService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  async getProfile(): Promise<AdminProfileData> {
    const values = await this.readFields(PROFILE_KEY_TO_FIELD);
    const name = values.name ?? adminProfileDefaults.name;
    const email = values.email ?? adminProfileDefaults.email;
    const role = values.role ?? adminProfileDefaults.role;
    return {
      name,
      email,
      role,
      initials: deriveInitials(name),
      memberSince: values.memberSince ?? adminProfileDefaults.memberSince,
      lastLogin: values.lastLogin ?? adminProfileDefaults.lastLogin,
    };
  }

  async updateProfile(input: AdminProfileInput): Promise<AdminProfileData> {
    const entries = SettingsServiceImpl.buildEntries(input);
    if (entries.length > 0) await this.settingsRepository.upsertMany(entries);
    return this.getProfile();
  }

  async getSettings(): Promise<AdminSettingsData> {
    const values = await this.readFields(SETTING_KEY_TO_FIELD);
    return {
      siteName: values.siteName ?? adminSettingsDefaults.siteName,
      defaultCurrency: values.defaultCurrency ?? adminSettingsDefaults.defaultCurrency,
      refreshInterval: values.refreshInterval ?? adminSettingsDefaults.refreshInterval,
      timezone: values.timezone ?? adminSettingsDefaults.timezone,
      retentionDays: values.retentionDays ?? adminSettingsDefaults.retentionDays,
      emailAlerts: parseBoolean(values.emailAlerts, adminSettingsDefaults.emailAlerts),
      failureAlerts: parseBoolean(values.failureAlerts, adminSettingsDefaults.failureAlerts),
      dailyDigest: parseBoolean(values.dailyDigest, adminSettingsDefaults.dailyDigest),
      weeklyReport: parseBoolean(values.weeklyReport, adminSettingsDefaults.weeklyReport),
    };
  }

  async updateSettings(input: AdminSettingsInput): Promise<AdminSettingsData> {
    const entries: SettingEntry[] = [];
    for (const [field, value] of Object.entries(input)) {
      const isBoolean = Object.prototype.hasOwnProperty.call(BOOLEAN_SETTING_KEY, field);
      const key = isBoolean ? BOOLEAN_SETTING_KEY[field]! : toSnakeCase(field);
      entries.push({ key, value: String(value) });
    }
    if (entries.length > 0) await this.settingsRepository.upsertMany(entries);
    return this.getSettings();
  }

  /**
   * Reads every persisted setting once and maps the known keys onto their
   * response fields. Keys without a row are absent from the result — the
   * caller applies the configured default.
   */
  private async readFields(
    keyToField: Record<string, keyof AdminProfileData | keyof AdminSettingsData>,
  ): Promise<Record<string, string>> {
    const rows = await this.settingsRepository.findAllSettings();
    const values: Record<string, string> = {};
    for (const row of rows) {
      const field = keyToField[row.key];
      if (field !== undefined) values[field] = row.value;
    }
    return values;
  }

  /** Builds the settings entries for the editable profile fields. */
  private static buildEntries(input: AdminProfileInput): SettingEntry[] {
    const entries: SettingEntry[] = [];
    if (input.name !== undefined) entries.push({ key: "admin_name", value: input.name });
    if (input.email !== undefined) entries.push({ key: "admin_email", value: input.email });
    if (input.role !== undefined) entries.push({ key: "admin_role", value: input.role });
    return entries;
  }
}

/** Parses a stored boolean string; falls back when the key has no row. */
function parseBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  return raw === "true";
}

/** Converts a camelCase field to the snake_case settings key (`siteName` → `site_name`). */
function toSnakeCase(field: string): string {
  return field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Derives avatar initials from a name: first letters of the first two words
 * ("Root Admin" → "RA"), or the first two letters of a single word
 * ("Administrator" → "AD").
 */
function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const second = parts[1] ?? "";
  if (first.length === 0) return "AD";
  if (second.length === 0) return first.slice(0, 2).toUpperCase();
  return first.charAt(0).toUpperCase() + second.charAt(0).toUpperCase();
}
