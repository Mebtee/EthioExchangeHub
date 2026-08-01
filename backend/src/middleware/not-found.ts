import type { NextFunction, Request, Response } from "express";

import { NotFoundError } from "../lib/errors";

/**
 * 404 handler — any request that reaches this middleware did not match a route.
 * Registered AFTER all routes so it only catches unmatched paths.
 */
export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError("Route not found."));
}
