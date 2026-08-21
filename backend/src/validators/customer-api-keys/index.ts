/**
 * Customer API-key request validation (Phase 2B).
 *
 * Body schemas are strict: unknown keys are rejected so typos surface as 422
 * instead of being silently ignored. `expires_at` is format-checked here;
 * the "must be in the future" business rule lives in the service (it needs
 * the clock). A `customer_id` is deliberately NOT an accepted input — the
 * owning customer is always resolved from the authenticated JWT subject.
 */

import { z } from "zod";

import { trimmedStringSchema, uuidSchema } from "../common";

/** Body for `POST /customer/api-keys`. */
export const createApiKeyBodySchema = z
  .object({
    name: trimmedStringSchema.max(100, "must be at most 100 characters"),
    expires_at: z
      .string()
      .datetime({ offset: true, message: "must be a valid ISO 8601 timestamp" })
      .optional(),
  })
  .strict();

/** Route params for `DELETE /customer/api-keys/:id`. */
export const apiKeyIdParamsSchema = z.object({ id: uuidSchema }).strict();
