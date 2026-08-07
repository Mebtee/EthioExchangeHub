/**
 * Manual-rate validation — list query, create body, and update body.
 *
 * Body schemas are strict: unknown keys are rejected so typos surface as 422
 * instead of being silently ignored. Numeric ranges and formats mirror the
 * service layer (`assertPositiveRate`, `assertIsoDate`, ...).
 */

import { z } from "zod";

import { bankCodeSchema, currencyCodeSchema, isoDateSchema } from "../common";

/** Query for `GET /manual-rates` — all filters optional. */
export const manualRateListQuerySchema = z.object({
  bankCode: bankCodeSchema.optional(),
  currencyCode: currencyCodeSchema.optional(),
  rateDate: isoDateSchema.optional(),
});

/** Body for `POST /manual-rates`. */
export const createManualRateBodySchema = z
  .object({
    bank_code: bankCodeSchema,
    currency_code: currencyCodeSchema,
    buying_rate: z.number().positive("must be a positive number").finite("must be a finite number"),
    selling_rate: z
      .number()
      .positive("must be a positive number")
      .finite("must be a finite number"),
    transactional_buying: z
      .number()
      .positive("must be a positive number")
      .finite("must be a finite number")
      .nullish(),
    transactional_selling: z
      .number()
      .positive("must be a positive number")
      .finite("must be a finite number")
      .nullish(),
    rate_date: isoDateSchema,
    /** Empty/whitespace notes normalize to null (mirrors the service's `normalizeNote`). */
    note: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? null : value),
      z.string().trim().max(500, "must be at most 500 characters").nullish(),
    ),
    /** Optional FK to the auth user id. */
    entered_by: z.string().trim().min(1, "must not be empty").max(64).nullish(),
  })
  .strict();

/** Body for `PUT /manual-rates/:id` — any subset, but at least one field. */
export const updateManualRateBodySchema = createManualRateBodySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "at least one field must be provided",
  });
