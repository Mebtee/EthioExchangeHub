import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * API-key cryptography helpers.
 *
 * The full key is ONLY ever returned by {@link generateApiKey} at creation
 * time; everywhere else it exists as a SHA-256 hex digest. Randomness comes
 * from Node's CSPRNG (`randomBytes`) — never `Math.random()`. Comparison uses
 * `timingSafeEqual` so verification does not leak timing information.
 *
 * Key anatomy:
 *   eeh_live_<43 base64url chars>   (52 chars total)
 *   \______/  \_________________/
 *    scheme     32 random bytes (~256 bits of entropy)
 *
 * `key_prefix` stores the scheme plus the first 8 secret characters — a
 * recognizable public identifier for lists/UI. Exposing those 48 bits leaves
 * 35 unknown base64url chars (~210 bits), far beyond brute-force reach.
 */

/** Public scheme every customer API key starts with (not secret). */
export const API_KEY_SCHEME = "eeh_live_";

/** Random bytes behind the secret part — 256 bits of entropy. */
const SECRET_BYTES = 32;

/** Secret characters echoed in the public prefix (after the scheme). */
const PREFIX_SECRET_CHARS = 8;

/** A freshly generated API key: the one-time secret and its public prefix. */
export interface GeneratedApiKey {
  /** The complete key — shown to the customer exactly once, never stored. */
  key: string;
  /** Public identifier stored in `api_keys.key_prefix` (scheme + 8 chars). */
  keyPrefix: string;
}

/** Generates a cryptographically secure API key and its public prefix. */
export function generateApiKey(): GeneratedApiKey {
  const secret = randomBytes(SECRET_BYTES).toString("base64url");
  const key = `${API_KEY_SCHEME}${secret}`;
  return { key, keyPrefix: key.slice(0, API_KEY_SCHEME.length + PREFIX_SECRET_CHARS) };
}

/** SHA-256 hex digest of the complete key — the only persisted form. */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

/**
 * Constant-time check whether a supplied key matches a stored digest.
 * Returns false for malformed digests instead of throwing.
 */
export function verifyApiKey(key: string, storedHash: string): boolean {
  const expected = Buffer.from(storedHash, "hex");
  if (expected.length === 0) return false;
  const candidate = Buffer.from(hashApiKey(key), "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
