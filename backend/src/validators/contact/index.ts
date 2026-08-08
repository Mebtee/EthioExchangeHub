/**
 * Contact-message validation — body for `POST /contact/messages`.
 *
 * Body schema is strict: unknown keys are rejected so typos surface as 422
 * instead of being silently ignored. Length bounds keep submissions bounded
 * (mirror the DB column types — text columns have no length limits, so these
 * caps are the only guard).
 */

import { z } from "zod";

/** Body for `POST /contact/messages`. */
export const createContactMessageBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "must be at least 2 characters")
      .max(120, "must be at most 120 characters"),
    email: z
      .string()
      .trim()
      .min(1, "must not be empty")
      .max(254, "must be at most 254 characters")
      .email("must be a valid email address"),
    subject: z
      .string()
      .trim()
      .min(1, "must not be empty")
      .max(200, "must be at most 200 characters"),
    message: z
      .string()
      .trim()
      .min(10, "must be at least 10 characters")
      .max(5000, "must be at most 5000 characters"),
  })
  .strict();
