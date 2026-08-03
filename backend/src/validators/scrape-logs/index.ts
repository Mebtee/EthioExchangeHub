/**
 * Scrape-log validation. `GET /scrape-logs` accepts optional filters plus
 * pagination; `GET /scrape-logs/:runId` accepts only pagination.
 *
 * `status` is an enum grounded in the live data (success / failed);
 * `scenario` is free text in the database, so it stays a trimmed string.
 */

import { z } from "zod";

import {
  bankCodeSchema,
  nonNegativeIntStringSchema,
  paginationQuerySchema,
  positiveIntStringSchema,
  trimmedStringSchema,
  uuidSchema,
} from "../common";

/** Query for `GET /scrape-logs` — filters + pagination. */
export const scrapeLogsQuerySchema = z.object({
  bankCode: bankCodeSchema.optional(),
  runId: uuidSchema.optional(),
  status: z
    .enum(["success", "failed"], {
      errorMap: () => ({ message: 'must be "success" or "failed"' }),
    })
    .optional(),
  scenario: trimmedStringSchema.optional(),
  limit: positiveIntStringSchema.optional(),
  offset: nonNegativeIntStringSchema.optional(),
});

/** Query for `GET /scrape-logs/:runId` — pagination only. */
export const scrapeLogsByRunQuerySchema = paginationQuerySchema;
