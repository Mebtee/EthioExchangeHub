import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";
import type { Database, SettingRow } from "@/types/database";
import { BaseRepository } from "./BaseRepository";

/** A single key/value setting to persist. */
export interface SettingEntry {
  key: string;
  value: string;
}

/**
 * `settings` repository — key/value admin configuration.
 *
 * One row per key (natural key, no id). Read all rows for the full set;
 * `upsertMany` inserts missing keys and updates existing ones so callers can
 * persist exactly the keys they were given without round-tripping state.
 * Query-only — value serialization (booleans) belongs to the service layer.
 */
export class SettingsRepository extends BaseRepository<"settings"> {
  constructor(client: SupabaseClient<Database> = getSupabase()) {
    super(client, "settings");
  }

  /** All settings rows (the entire key/value store). */
  findAllSettings(): Promise<SettingRow[]> {
    return super.findAll();
  }

  /**
   * Persists each entry: updates the row when the key already exists,
   * inserts it otherwise. `updated_at` is stamped here (data-access
   * plumbing). Returns the saved rows.
   */
  async upsertMany(entries: SettingEntry[]): Promise<SettingRow[]> {
    const saved: SettingRow[] = [];
    for (const entry of entries) {
      const updatedAt = new Date().toISOString();
      const existing = await this.findOneBy({ key: entry.key });
      if (existing) {
        const updated = await this.updateBy(
          { key: entry.key },
          { value: entry.value, updated_at: updatedAt },
        );
        if (updated) saved.push(updated);
      } else {
        saved.push(
          await this.insert({ key: entry.key, value: entry.value, updated_at: updatedAt }),
        );
      }
    }
    return saved;
  }
}
