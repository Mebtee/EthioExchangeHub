import { EventEmitter } from "node:events";

import type { Request, Response } from "express";
import { beforeEach, describe, expect, it } from "vitest";

import { registry } from "@/lib/metrics";
import { metricsMiddleware } from "@/middleware/metrics";

import { createMockNext, createMockRequest } from "../../helpers/http";

/** A minimal res-like object that can emit "finish" (what the middleware hooks). */
function makeMockResponse(statusCode = 200): Response {
  const emitter = new EventEmitter();
  const res = emitter as unknown as Response;
  (res as { statusCode?: number }).statusCode = statusCode;
  return res;
}

function emitFinish(res: Response, statusCode = 200): void {
  (res as { statusCode: number }).statusCode = statusCode;
  (res as unknown as EventEmitter).emit("finish");
}

beforeEach(() => {
  registry.resetMetrics();
});

describe("metricsMiddleware", () => {
  it("calls next immediately", () => {
    const next = createMockNext();
    metricsMiddleware(createMockRequest(), makeMockResponse(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("records request count and duration on response finish", async () => {
    const req = createMockRequest({ params: {} }) as Request & {
      route?: { path?: string };
      path?: string;
    };
    req.method = "GET";
    req.path = "/api/v1/banks";
    req.route = { path: "/api/v1/banks" };

    const res = makeMockResponse(200);
    metricsMiddleware(req, res, createMockNext());
    emitFinish(res, 200);

    const metrics = await registry.getMetricsAsJSON();
    const counter = metrics.find((m) => m.name === "http_requests_total");
    expect(counter).toBeDefined();
    expect(counter?.values).toHaveLength(1);
    expect(counter?.values[0]?.labels).toMatchObject({
      method: "GET",
      route: "/api/v1/banks",
      status_code: "200",
    });
    expect(counter?.values[0]?.value).toBe(1);

    const histogram = metrics.find((m) => m.name === "http_request_duration_seconds");
    expect(
      histogram?.values.some((v) => v.metricName.includes("http_request_duration_seconds_sum")),
    ).toBe(true);
  });

  it("collapses unmatched requests to a single bounded route label", async () => {
    const req = createMockRequest({ params: {} }) as Request & {
      route?: { path?: string };
      path?: string;
    };
    req.method = "GET";
    req.path = "/api/v1/nonexistent";
    req.route = undefined;

    const res = makeMockResponse(404);
    metricsMiddleware(req, res, createMockNext());
    emitFinish(res, 404);

    const counter = (await registry.getMetricsAsJSON()).find(
      (m) => m.name === "http_requests_total",
    );
    expect(counter?.values[0]?.labels).toMatchObject({
      route: "unmatched",
      status_code: "404",
    });
  });

  it("does not record requests to /metrics itself", async () => {
    const req = createMockRequest({ params: {} }) as Request & {
      route?: { path?: string };
      path?: string;
    };
    req.method = "GET";
    req.path = "/metrics";

    const res = makeMockResponse(200);
    metricsMiddleware(req, res, createMockNext());
    emitFinish(res, 200);

    const counter = (await registry.getMetricsAsJSON()).find(
      (m) => m.name === "http_requests_total",
    );
    expect(counter?.values ?? []).toHaveLength(0);
  });

  it("records multiple requests with different status codes", async () => {
    const req = createMockRequest({ params: {} }) as Request & {
      route?: { path?: string };
      path?: string;
    };
    req.method = "GET";
    req.path = "/health";
    req.route = { path: "/health" };

    const res = makeMockResponse(200);
    metricsMiddleware(req, res, createMockNext());
    emitFinish(res, 200);
    emitFinish(res, 503);

    const counter = (await registry.getMetricsAsJSON()).find(
      (m) => m.name === "http_requests_total",
    );
    expect(counter?.values ?? []).toHaveLength(2);
  });
});
