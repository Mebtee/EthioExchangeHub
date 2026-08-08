/**
 * Integration-test Supabase helper.
 *
 * The app's composition root (`routes/index.ts`) constructs repositories with
 * the shared `getSupabase()` singleton. For integration tests the
 * `@/lib/supabase` module is mocked so `getSupabase()` returns ONE in-memory
 * fake client instance shared by the whole stack — routes → controllers →
 * services → repositories all run against seeded fake data, never a real
 * database.
 *
 * `seedFakeClient` mutates that same instance's tables (clear + reseed), so
 * per-test isolation works even though repositories captured the instance at
 * module load. `verifyDatabaseConnection` is mocked through
 * `setDatabaseConnected` so the health endpoint can be exercised both ways.
 */

import {
  createFakeSupabaseClient,
  type FakeSeed,
  type FakeSupabaseClient,
} from "./supabase-client";

import { banks } from "../fixtures/banks";
import { contactMessages } from "../fixtures/contact-messages";
import { exchangeRates } from "../fixtures/exchange-rates";
import { manualRates } from "../fixtures/manual-rates";
import { scrapeLogs } from "../fixtures/scrape-logs";
import { settings } from "../fixtures/settings";
import { users } from "../fixtures/users";

/** The standard seed — every live table populated with typed fixtures. */
export const defaultSeed: FakeSeed = {
  banks,
  contact_messages: contactMessages,
  exchange_rates: exchangeRates,
  manual_rates: manualRates,
  scrape_logs: scrapeLogs,
  settings,
  users,
};

let client: FakeSupabaseClient | null = null;
let connected = true;

/** Returns the single shared fake client (created lazily on first use). */
export function getFakeClient(): FakeSupabaseClient {
  if (!client) client = createFakeSupabaseClient();
  return client;
}

/** Replaces the client's table contents with the given seed (default: standard seed). */
export function seedFakeClient(seed: FakeSeed = defaultSeed): void {
  const current = getFakeClient();
  current.tables.clear();
  for (const [name, rows] of Object.entries(seed)) {
    current.tables.set(
      name,
      rows.map((row) => ({ ...row })),
    );
  }
  current.nextError = null;
}

/** Controls what the mocked `verifyDatabaseConnection` reports. */
export function setDatabaseConnected(value: boolean): void {
  connected = value;
}

/** Current mocked database-connectivity flag. */
export function isDatabaseConnected(): boolean {
  return connected;
}
