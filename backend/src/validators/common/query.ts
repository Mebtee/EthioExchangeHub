/**
 * Shared query-param schemas.
 *
 * Query values arrive as strings. They are validated (and trimmed) but kept
 * as strings so the locked controllers' existing `typeof === "string"` reads
 * and `Number()` coercions keep working unchanged. Rules per Phase 2G:
 * pagination `limit >= 1`, `offset >= 0`; dates `YYYY-MM-DD`; booleans only
 * the canonical `"true"` / `"false"` strings.
 */

import { z } from "zod";

import { isoDateSchema } from "./strings";

/** Boolean-as-string: only canonical `"true"` / `"false"` (controllers compare against `"true"`). */
export const booleanStringSchema = z
  .string()
  .trim()
  .regex(/^(true|false)$/, 'must be "true" or "false"');

/** Positive integer as a string (`limit`). Leading zeros rejected. */
export const positiveIntStringSchema = z
  .string()
  .trim()
  .regex(/^[1-9]\d*$/, "must be a positive integer (>= 1)");

/** Non-negative integer as a string (`offset`). */
export const nonNegativeIntStringSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "must be a non-negative integer (>= 0)");

/** Optional `from`/`to` ISO-date range. */
export const dateRangeQuerySchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

/** Optional `limit`/`offset` pagination. */
export const paginationQuerySchema = z.object({
  limit: positiveIntStringSchema.optional(),
  offset: nonNegativeIntStringSchema.optional(),
});
