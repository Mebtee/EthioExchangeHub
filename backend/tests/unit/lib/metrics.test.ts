import { beforeEach, describe, expect, it } from "vitest";

import {
  httpRequestDurationSeconds,
  httpRequestsTotal,
  registry,
  renderMetrics,
} from "@/lib/metrics";

beforeEach(() => {
  registry.resetMetrics();
});

describe("metrics registry", () => {
  it("registers the custom request metrics", async () => {
    const metrics = await registry.getMetricsAsJSON();
    const metricNames = metrics.map((m) => m.name);
    expect(metricNames).toContain("http_requests_total");
    expect(metricNames).toContain("http_request_duration_seconds");
  });

  it("records request count with labels", async () => {
    httpRequestsTotal.inc({ method: "GET", route: "/api/v1/banks", status_code: "200" });
    httpRequestsTotal.inc({ method: "GET", route: "/api/v1/banks", status_code: "200" });
    httpRequestsTotal.inc({ method: "POST", route: "/api/v1/manual-rates", status_code: "422" });

    const text = await renderMetrics();
    expect(text).toContain("# HELP http_requests_total");
    expect(text).toContain("# TYPE http_requests_total counter");
    expect(text).toContain(
      'http_requests_total{method="GET",route="/api/v1/banks",status_code="200"} 2',
    );
    expect(text).toContain(
      'http_requests_total{method="POST",route="/api/v1/manual-rates",status_code="422"} 1',
    );
  });

  it("records request duration histogram observations", async () => {
    httpRequestDurationSeconds.observe(
      { method: "GET", route: "/api/v1/banks", status_code: "200" },
      0.0123,
    );

    const text = await renderMetrics();
    expect(text).toContain("# HELP http_request_duration_seconds");
    expect(text).toContain("# TYPE http_request_duration_seconds histogram");
    expect(text).toMatch(/http_request_duration_seconds_bucket/);
    expect(text).toMatch(/http_request_duration_seconds_count\{[^}]*\} 1/);
    expect(text).toMatch(/http_request_duration_seconds_sum\{[^}]*\} 0.0123/);
  });

  it("resetMetrics clears recorded values between tests", async () => {
    httpRequestsTotal.inc({ method: "GET", route: "/x", status_code: "200" });
    registry.resetMetrics();

    const text = await renderMetrics();
    expect(text).not.toMatch(/http_requests_total\{/);
  });
});
