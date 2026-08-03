/**
 * Prometheus metrics (Phase 2K — infrastructure only).
 *
 * A single shared registry holds every metric the `/metrics` endpoint exposes:
 *
 * - `http_requests_total`            — request count, labelled by method/route/status
 * - `http_request_duration_seconds`  — request duration histogram (same labels)
 * - default Node/process collectors  — uptime, memory, CPU, event-loop delay,
 *   GC activity, libuv handles etc. (via prom-client `collectDefaultMetrics`)
 *
 * Default collectors are skipped in the test environment so the suite never
 * holds a background sampling timer open. No business logic lives here.
 */

import client from "prom-client";

/** Shared Prometheus registry — every metric is registered on this instance. */
export const registry = new client.Registry();

/** Total number of HTTP requests, labelled with method / route / status code. */
export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests processed.",
  labelNames: ["method", "route", "status_code"],
  registers: [registry],
});

/** Histogram of HTTP request durations (seconds). */
export const httpRequestDurationSeconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds.",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

// Process-level metrics (uptime, memory, CPU, event-loop delay, GC, …).
// Skipped under NODE_ENV=test so vitest never keeps a background timer open.
if (process.env.NODE_ENV !== "test") {
  client.collectDefaultMetrics({ register: registry, eventLoopMonitoringPrecision: 10 });
}

/** Renders the full Prometheus exposition text for the shared registry. */
export async function renderMetrics(): Promise<string> {
  return registry.metrics();
}
