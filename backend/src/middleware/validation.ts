/**
 * Generic request-validation middleware (Phase 2G).
 *
 * Three reusable factories — `validateParams`, `validateQuery`, `validateBody`
 * — each parse one request source against a supplied Zod schema BEFORE the
 * controller runs, so controllers always receive already-validated data.
 *
 * Responsibilities ONLY:
 * - parse params / query / body against a schema
 * - forward a `ValidationError` to the global error middleware on failure
 * - replace the validated source with the parsed (trimmed/coerced) result
 *
 * No business logic, no service/repository calls, no response formatting.
 * The global error handler owns the `{ success: false, ... }` envelope.
 */

import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, type ZodTypeAny } from "zod";

import { ValidationError } from "@/lib/errors";

/** Joins Zod issues into a single readable message, prefixed with the source. */
function formatIssues(error: ZodError, source: string): string {
  const details = error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
  return `Invalid ${source}: ${details}`;
}

/** Validates route params against `schema`; parsed values replace `req.params`. */
export function validateParams(schema: ZodTypeAny): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      next(new ValidationError(formatIssues(result.error, "request parameters")));
      return;
    }
    req.params = result.data as unknown as Request["params"];
    next();
  };
}

/** Validates query params against `schema`; parsed values replace `req.query`. */
export function validateQuery(schema: ZodTypeAny): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(new ValidationError(formatIssues(result.error, "query parameters")));
      return;
    }
    req.query = result.data as unknown as Request["query"];
    next();
  };
}

/** Validates the request body against `schema`; parsed values replace `req.body`. */
export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new ValidationError(formatIssues(result.error, "request body")));
      return;
    }
    req.body = result.data as unknown;
    next();
  };
}
