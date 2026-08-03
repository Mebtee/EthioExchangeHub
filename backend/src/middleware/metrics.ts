/**
 * Request metrics middleware (Phase 2K — infrastructure only).
 *
 * Measures every request (method, matched route, status code) and records:
 * - `http_requests_total` increment
 * - `http_request_duration_seconds` observation
 *
 * The `/metrics` endpoint itself is excluded so scraping never feeds back
 * into the metrics. No business logic, no response formatting.
 */

import type { NextFunction, Request, Response } from "express";

import { METRICS_PATH } from "@/constants";
import { httpRequestDurationSeconds, httpRequestsTotal } from "@/lib/metrics";

/**
 * The route label: the full matched pattern (e.g. `/api/v1/rates/latest/:bankCode`)
 * for matched routes. Unmatched requests (404s) collapse to a single bounded
 * `unmatched` label — never the raw path — so random probe paths cannot
 * create unbounded Prometheus time-series cardinality. Query strings and
 * concrete ids never appear in labels.
 */
function routeLabel(req: Request): string {
  const base = req.baseUrl ?? "";
  const route = req.route?.path ?? "";
  const full = `${base}${route}`.replace(/\/+$/, "");
  return full || "unmatched";
}

/** Records count + duration for a completed request. */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    if (req.path === METRICS_PATH) return;
    const labels = {
      method: req.method,
      route: routeLabel(req),
      status_code: String(res.statusCode),
    };
    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, durationSeconds);
  });

  next();
}
