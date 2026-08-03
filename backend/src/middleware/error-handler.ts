import type { NextFunction, Request, Response } from "express";

import { AppError } from "@/lib/errors";
import { env } from "@/utils/validate-env";
import { logger } from "@/lib/logger";
import { errorResponse } from "@/utils/api-response";

/**
 * Centralized error handler — the single place where errors become HTTP responses.
 * Registered AFTER the 404 handler so it catches both route errors and unmatched paths.
 *
 * - Errors that extend AppError keep their own status code + message.
 * - Unknown errors become a 500 and, in non-production, leak the stack trace.
 * - Every error is logged; server-side details never leak to clients in production.
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    logger.warn(`${err.statusCode} ${err.code}: ${err.message}`);
    errorResponse(res, err.message, err.statusCode);
    return;
  }

  // Body-parser errors carry a `type` — translate them into clean client
  // errors instead of a generic 500 (Phase 3A security hardening).
  const bodyParserError = err as Error & { type?: string };
  if (bodyParserError.type === "entity.parse.failed") {
    logger.warn("Malformed request body rejected");
    errorResponse(res, "Malformed JSON in request body.", 400);
    return;
  }
  if (bodyParserError.type === "entity.too.large") {
    logger.warn("Oversized request payload rejected");
    errorResponse(res, "Request payload too large.", 413);
    return;
  }

  logger.error("Unhandled error", { error: err.message, stack: err.stack });

  const message =
    env.NODE_ENV === "production"
      ? "Internal server error."
      : err.message || "Internal server error.";

  errorResponse(res, message, 500);
}
