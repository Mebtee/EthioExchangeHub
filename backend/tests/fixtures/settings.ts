import type { SettingRow } from "@/types/database";

/**
 * Typed settings fixtures — a subset of persisted keys. Keys without a row
 * exercise the configured-defaults merge path in the settings service.
 */
export const settings: SettingRow[] = [
  { key: "admin_name", value: "Root Admin", updated_at: "2026-01-01T09:00:00.000Z" },
  { key: "site_name", value: "Ethio Exchange Hub", updated_at: "2026-01-01T09:00:00.000Z" },
  { key: "default_currency", value: "USD", updated_at: "2026-01-01T09:00:00.000Z" },
  { key: "email_alerts", value: "true", updated_at: "2026-01-01T09:00:00.000Z" },
];
