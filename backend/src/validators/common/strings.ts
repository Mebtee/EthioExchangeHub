/**
 * Shared primitive string schemas for the validation layer.
 *
 * Pure format/constraint checks — zero business logic. Rules mirror the
 * service-layer helpers (`services/helpers/Validation.ts`) so HTTP validation
 * and business validation agree; the HTTP layer simply rejects early with a
 * clear message before controllers run.
 */

import { z } from "zod";

/** Non-empty trimmed string — rejects empty and whitespace-only values. */
export const trimmedStringSchema = z.string().trim().min(1, "must not be empty");

/** Bank code — a non-empty trimmed string (mirrors `assertBankCode`). */
export const bankCodeSchema = trimmedStringSchema.max(32, "must be at most 32 characters");

/** ISO 4217-style currency code — exactly 3 uppercase letters (mirrors `assertCurrencyCode`). */
export const currencyCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}$/, "must be exactly 3 uppercase letters");

/**
 * ISO date `YYYY-MM-DD`. `z.string().date()` validates both the format and
 * that it is a real calendar date (e.g. 2026-02-30 is rejected).
 */
export const isoDateSchema = z.string().date("must be a valid date in YYYY-MM-DD format");

/** UUID (route params such as `:id` and `:runId`). */
export const uuidSchema = z.string().uuid("must be a valid UUID");
