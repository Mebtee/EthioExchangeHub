import type { NextFunction, Request, RequestHandler, Response } from "express";

/** Route params shape (structural equivalent of Express's `ParamsDictionary`). */
type RouteParams = Record<string, string>;

/**
 * An Express route handler that may return a promise. Rejections are
 * forwarded to `next`, so controllers never need repetitive try/catch.
 */
type AsyncRouteHandler<P extends RouteParams = RouteParams> = (
  req: Request<P>,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

/**
 * Wraps an async route handler so rejected promises are passed to the
 * Express error middleware (`next(error)`) instead of crashing the process.
 * The global error handler remains the single place that formats responses.
 */
export function asyncHandler<P extends RouteParams = RouteParams>(
  handler: AsyncRouteHandler<P>,
): RequestHandler<P> {
  // `handler` is invoked inside a `then` so even a synchronous throw becomes
  // a rejection that reaches `next(error)` instead of escaping the wrapper.
  return (req, res, next) => {
    Promise.resolve()
      .then(() => handler(req, res, next))
      .catch(next);
  };
}
