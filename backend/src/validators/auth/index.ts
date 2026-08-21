/**
 * Auth request validation (A1).
 *
 * Body schemas are strict: unknown keys are rejected so typos surface as 422
 * instead of being silently ignored. Passwords are never trimmed or lowercased
 * (they are opaque secrets); emails are trimmed and lowercased by the service.
 */

import { z } from "zod";

import { trimmedStringSchema } from "../common";

/** Body for `POST /auth/login`. */
export const loginBodySchema = z
  .object({
    email: z
      .string()
      .trim()
      .email("must be a valid email address")
      .max(254, "must be at most 254 characters"),
    password: z
      .string()
      .min(1, "password is required")
      .max(1024, "must be at most 1024 characters"),
  })
  .strict();

/** Body for `POST /auth/refresh`. */
export const refreshBodySchema = z
  .object({
    refreshToken: z.string().min(1, "refreshToken is required"),
  })
  .strict();

/** Body for `POST /auth/forgot-password`. */
export const forgotPasswordBodySchema = z
  .object({
    email: z
      .string()
      .trim()
      .email("must be a valid email address")
      .max(254, "must be at most 254 characters"),
  })
  .strict();

/** Body for `POST /auth/reset-password` — token plus the new password. */
export const resetPasswordBodySchema = z
  .object({
    token: z.string().min(1, "token is required"),
    password: trimmedStringSchema
      .min(12, "must be at least 12 characters")
      .max(1024, "must be at most 1024 characters")
      .regex(/[A-Z]/, "must contain at least one uppercase letter")
      .regex(/[a-z]/, "must contain at least one lowercase letter")
      .regex(/[0-9]/, "must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "must contain at least one special character"),
  })
  .strict();

/**
 * Body for `POST /auth/register` — customer sign-up (Phase 2A).
 *
 * The password rules mirror `resetPasswordBodySchema` exactly so a password
 * accepted at registration is also accepted at reset. `company_name`/`phone`
 * are optional customer-profile fields persisted to the `customers` table.
 */
export const registerBodySchema = z
  .object({
    email: z
      .string()
      .trim()
      .email("must be a valid email address")
      .max(254, "must be at most 254 characters"),
    password: trimmedStringSchema
      .min(12, "must be at least 12 characters")
      .max(1024, "must be at most 1024 characters")
      .regex(/[A-Z]/, "must contain at least one uppercase letter")
      .regex(/[a-z]/, "must contain at least one lowercase letter")
      .regex(/[0-9]/, "must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "must contain at least one special character"),
    company_name: trimmedStringSchema.max(160, "must be at most 160 characters").optional(),
    phone: trimmedStringSchema.max(32, "must be at most 32 characters").optional(),
  })
  .strict();
