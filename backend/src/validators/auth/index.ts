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
      .min(8, "must be at least 8 characters")
      .max(1024, "must be at most 1024 characters"),
  })
  .strict();
