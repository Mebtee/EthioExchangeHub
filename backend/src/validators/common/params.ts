/**
 * Shared route-param schemas. Composed from the primitive string schemas so
 * every domain validates identical params identically (DRY).
 */

import { z } from "zod";

import { bankCodeSchema, currencyCodeSchema, uuidSchema } from "./strings";

/** Route params `:bankCode`. */
export const bankCodeParamsSchema = z.object({
  bankCode: bankCodeSchema,
});

/** Route params `:bankCode` + `:currencyCode`. */
export const bankAndCurrencyParamsSchema = z.object({
  bankCode: bankCodeSchema,
  currencyCode: currencyCodeSchema,
});

/** Route params `:id` (UUID). */
export const uuidParamsSchema = z.object({
  id: uuidSchema,
});

/** Route params `:runId` (UUID). */
export const runIdParamsSchema = z.object({
  runId: uuidSchema,
});
