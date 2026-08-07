/**
 * Shared business-validation helpers. Every failure throws the application's
 * `ValidationError` (422) — never raw errors from the database layer.
 *
 * Note: the live schema has no `currencies` table, so currency validation is
 * format-based (ISO 4217-style 3-letter code) rather than existence-checked.
 */

import { ValidationError } from "@/lib/errors";

const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Throws when `value` is not a non-empty bank code string. */
export function assertBankCode(value: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError("Bank code is required.");
  }
}

/** Throws when `value` is not a 3-letter uppercase currency code. */
export function assertCurrencyCode(value: string): void {
  if (!CURRENCY_CODE_PATTERN.test(value)) {
    throw new ValidationError(
      `"${value}" is not a valid currency code (expected 3 uppercase letters).`,
    );
  }
}

/**
 * Throws when `value` is not a valid ISO date (YYYY-MM-DD). Implemented as a
 * throw-wrapper over `isIsoDate` so the two helpers can never drift apart.
 */
export function assertIsoDate(value: string): void {
  if (!isIsoDate(value)) {
    throw new ValidationError(`"${value}" is not a valid date (expected YYYY-MM-DD).`);
  }
}

/** Non-throwing ISO date check — true when `value` matches YYYY-MM-DD. */
export function isIsoDate(value: string): boolean {
  return ISO_DATE_PATTERN.test(value);
}

/** Throws when `value` is not a finite positive number. */
export function assertPositiveRate(value: number): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new ValidationError("Rate must be a positive number.");
  }
}

/**
 * Validates an optional rate field: `null`/`undefined` are allowed (absent),
 * anything else must be a finite positive number.
 */
export function assertNullablePositiveRate(value: number | null | undefined): void {
  if (value === null || value === undefined) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new ValidationError("Rate must be a positive number.");
  }
}
