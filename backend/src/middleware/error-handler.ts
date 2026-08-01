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

  logger.error("Unhandled error", { error: err.message, stack: err.stack });

  const message =
    env.NODE_ENV === "production"
      ? "Internal server error."
      : err.message || "Internal server error.";

  errorResponse(res, message, 500);
}
