/**
 * Admin validation — profile/settings bodies and the rate-trend query.
 *
 * Body schemas are strict: unknown keys are rejected so typos surface as 422
 * instead of being silently ignored. Both update bodies accept any subset but
 * require at least one field (an empty update would be a no-op).
 */

import { z } from "zod";

import { currencyCodeSchema, positiveIntStringSchema, trimmedStringSchema } from "../common";

/** Body for `PUT /admin/profile` — any subset, at least one field. */
export const updateAdminProfileBodySchema = z
  .object({
    name: trimmedStringSchema.max(100, "must be at most 100 characters").optional(),
    email: z
      .string()
      .trim()
      .email("must be a valid email address")
      .max(254, "must be at most 254 characters")
      .optional(),
    role: trimmedStringSchema.max(64, "must be at most 64 characters").optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "at least one field must be provided",
  });

/** Body for `PUT /admin/settings` — any subset, at least one field. */
export const updateAdminSettingsBodySchema = z
  .object({
    siteName: trimmedStringSchema.max(100, "must be at most 100 characters").optional(),
    defaultCurrency: currencyCodeSchema.optional(),
    refreshInterval: trimmedStringSchema.max(32, "must be at most 32 characters").optional(),
    timezone: trimmedStringSchema.max(64, "must be at most 64 characters").optional(),
    retentionDays: trimmedStringSchema.max(16, "must be at most 16 characters").optional(),
    emailAlerts: z.boolean().optional(),
    failureAlerts: z.boolean().optional(),
    dailyDigest: z.boolean().optional(),
    weeklyReport: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "at least one field must be provided",
  });

/** Query for `GET /admin/dashboard/rate-trend` — optional `days` window and `currency` filter. */
export const rateTrendQuerySchema = z.object({
  days: positiveIntStringSchema.optional(),
  currency: currencyCodeSchema.optional(),
});
