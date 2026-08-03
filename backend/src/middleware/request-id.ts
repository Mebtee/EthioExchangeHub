/**
 * Request-id middleware (Phase 3 — infrastructure only).
 *
 * Resolves a request id per request — honoring an incoming `X-Request-ID`
 * when it is present and safe (e.g. forwarded by a reverse proxy for
 * end-to-end correlation), otherwise generating a UUID — attaches it to the
 * request (`req.id`), echoes it back in the `X-Request-ID` response header,
 * and runs the rest of the chain inside the logger's async-local request
 * context so every log line emitted while handling the request carries the id.
 *
 * Responsibilities ONLY: id resolution, header, and context. No business
 * logic, no service/repository calls, no response formatting.
 */

import { randomUUID } from "node:crypto";

import type { NextFunction, Request, Response } from "express";

import { requestContext } from "@/lib/logger";

/** Response header that carries the request id. */
export const REQUEST_ID_HEADER = "X-Request-ID";

/** A request augmented with the resolved request id. */
export type RequestWithId = Request & { id: string };

/**
 * Safe incoming-id shape: alphanumerics plus `._:-` (typical of proxies like
 * nginx `$request_id`), max 64 chars. Anything else is rejected to avoid
 * header-injection / oversized values.
 */
const INCOMING_REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/;

/** Accepts a safe client/proxy-supplied id, else generates a UUID. */
function resolveRequestId(req: Request): string {
  const incoming = req.headers[REQUEST_ID_HEADER.toLowerCase()];
  if (typeof incoming === "string" && INCOMING_REQUEST_ID_PATTERN.test(incoming)) {
    return incoming;
  }
  return randomUUID();
}

/**
 * Resolves a request id, sets the `X-Request-ID` response header, and runs
 * the handler inside the logger's request context.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = resolveRequestId(req);
  (req as RequestWithId).id = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  requestContext.run({ requestId }, next);
}
