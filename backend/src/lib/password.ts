import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SALT_BYTES = 16;
const HASH_BYTES = 64;

/**
 * Hashes a password with a random per-user salt using Node's built-in scrypt
 * (no external dependency). Format: `saltHex:hashHex`. The salt is stored
 * alongside the hash so `verifyPassword` can recompute the expected value.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const hash = scryptSync(password, salt, HASH_BYTES).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Constant-time password verification against a stored `salt:hash` string.
 * Returns false for malformed stored values instead of throwing.
 */
export function verifyPassword(password: string, stored: string): boolean {
  const separator = stored.indexOf(":");
  if (separator <= 0) return false;
  const salt = stored.slice(0, separator);
  const expected = Buffer.from(stored.slice(separator + 1), "hex");
  if (expected.length === 0) return false;
  const candidate = scryptSync(password, salt, HASH_BYTES);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
