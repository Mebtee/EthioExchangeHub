import { randomBytes } from "node:crypto";

/**
 * System-generated, human-friendly payment references (Phase 3).
 *
 * Format: `EEH-PAY-YYYYMMDD-XXXXXXXX` — date of submission plus 8 characters
 * from an ambiguity-free alphabet (no 0/O, 1/I/L). The database enforces
 * uniqueness (`payments.payment_reference UNIQUE`) as the backstop; with 32^8
 * ≈ 1.1e12 combinations per day, collisions are practically impossible.
 */

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SUFFIX_LENGTH = 8;

export function generatePaymentReference(now: Date = new Date()): string {
  const day = now.toISOString().slice(0, 10).replace(/-/g, "");
  const bytes = randomBytes(SUFFIX_LENGTH);
  let suffix = "";
  for (const byte of bytes) {
    suffix += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];
  }
  return `EEH-PAY-${day}-${suffix}`;
}
