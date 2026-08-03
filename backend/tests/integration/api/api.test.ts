/**
 * API integration tests — full HTTP stack via Supertest.
 *
 * The `@/lib/supabase` module is mocked so the real composition root
 * (routes → controllers → services → repositories) runs against the shared
 * in-memory fake client. This verifies route mounting, middleware order,
 * validation, envelopes, and error paths end-to-end — with zero database I/O.
 */

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", async () => {
  const { getFakeClient, isDatabaseConnected } = await import("../../helpers/supabase");
  return {
    getSupabase: () => getFakeClient(),
    verifyDatabaseConnection: async () => isDatabaseConnected(),
  };
});

import { createApp } from "@/app";

import {
  defaultSeed,
  getFakeClient,
  seedFakeClient,
  setDatabaseConnected,
} from "../../helpers/supabase";

const app = createApp();

beforeEach(() => {
  seedFakeClient(defaultSeed);
  setDatabaseConnected(true);
});

describe("GET /health", () => {
  it("returns server + database healthy when connected", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: "Server and database are healthy.",
      data: { server: "OK", database: "Connected" },
    });
  });

  it("returns 503 with the error envelope when the database is unreachable", async () => {
    setDatabaseConnected(false);
    const res = await request(app).get("/health");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      success: false,
      message: "Database connection failed.",
      data: null,
    });
  });
});

describe("Banks endpoints", () => {
  it("GET /api/v1/banks lists all banks sorted by name", async () => {
    const res = await request(app).get("/api/v1/banks");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data.map((b: { bank_code: string }) => b.bank_code)).toEqual([
      "ABY",
      "CBE",
      "DASH",
    ]);
  });

  it("GET /api/v1/banks?activeOnly=true filters to active banks", async () => {
    const res = await request(app).get("/api/v1/banks?activeOnly=true");
    expect(res.body.data.map((b: { bank_code: string }) => b.bank_code)).toEqual(["ABY", "CBE"]);
  });

  it("GET /api/v1/banks?bankType=private filters by type", async () => {
    const res = await request(app).get("/api/v1/banks?bankType=private");
    expect(res.body.data.map((b: { bank_code: string }) => b.bank_code)).toEqual(["ABY", "DASH"]);
  });

  it("GET /api/v1/banks/active uses the literal route (not the :bankCode param)", async () => {
    const res = await request(app).get("/api/v1/banks/active");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it("GET /api/v1/banks/:bankCode returns one bank", async () => {
    const res = await request(app).get("/api/v1/banks/ABY");
    expect(res.status).toBe(200);
    expect(res.body.data.bank_name).toBe("Awash Bank");
  });

  it("GET /api/v1/banks/NOPE returns 404 with the error envelope", async () => {
    const res = await request(app).get("/api/v1/banks/NOPE");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Bank "NOPE" not found.',
      data: null,
    });
  });

  it("rejects non-canonical booleans with 422", async () => {
    const res = await request(app).get("/api/v1/banks?activeOnly=TRUE");
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.data).toBeNull();
  });

  it("rejects unknown bankType values with 422", async () => {
    const res = await request(app).get("/api/v1/banks?bankType=bogus");
    expect(res.status).toBe(422);
    expect(res.body.message).toContain('must be "private" or "state_owned"');
  });
});

describe("Exchange-rate endpoints", () => {
  it("GET /api/v1/rates/latest resolves one row per bank+currency", async () => {
    const res = await request(app).get("/api/v1/rates/latest");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data[0]!.rate_date).toBe("2026-08-01");
  });

  it("GET /api/v1/rates/latest?from=... filters by date range", async () => {
    const res = await request(app).get("/api/v1/rates/latest?from=2026-08-01");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
  });

  it("GET /api/v1/rates/latest rejects an impossible calendar date", async () => {
    const res = await request(app).get("/api/v1/rates/latest?from=2026-02-30");
    expect(res.status).toBe(422);
  });

  it("GET /api/v1/rates/latest/:bankCode returns the newest per currency", async () => {
    const res = await request(app).get("/api/v1/rates/latest/ABY");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]!.currency_code).toBe("EUR");
    expect(res.body.data[1]!.currency_code).toBe("USD");
  });

  it("GET /api/v1/rates/latest/:bankCode 404s for an unknown bank", async () => {
    const res = await request(app).get("/api/v1/rates/latest/NOPE");
    expect(res.status).toBe(404);
  });

  it("GET /api/v1/rates/latest/:bankCode/:currencyCode returns the newest single rate", async () => {
    const res = await request(app).get("/api/v1/rates/latest/ABY/USD");
    expect(res.status).toBe(200);
    expect(res.body.data.buying_rate).toBe(121.5);
    expect(res.body.data.rate_date).toBe("2026-08-01");
  });

  it("GET /api/v1/rates/latest/:bankCode/:currencyCode rejects a bad currency code", async () => {
    const res = await request(app).get("/api/v1/rates/latest/ABY/usd");
    expect(res.status).toBe(422);
  });

  it("GET /api/v1/rates/history/:bankCode/:currencyCode returns oldest-first history", async () => {
    const res = await request(app).get("/api/v1/rates/history/ABY/USD");
    expect(res.status).toBe(200);
    expect(res.body.data.map((r: { rate_date: string }) => r.rate_date)).toEqual([
      "2026-07-30",
      "2026-08-01",
    ]);
  });
});

describe("Manual-rate endpoints", () => {
  it("GET /api/v1/manual-rates lists rows newest-first", async () => {
    const res = await request(app).get("/api/v1/manual-rates");
    expect(res.status).toBe(200);
    expect(res.body.data.map((r: { rate_date: string }) => r.rate_date)).toEqual([
      "2026-08-02",
      "2026-08-01",
    ]);
  });

  it("POST /api/v1/manual-rates creates a rate and responds 201", async () => {
    const res = await request(app).post("/api/v1/manual-rates").send({
      bank_code: "ABY",
      currency_code: "EUR",
      buying_rate: 140.5,
      selling_rate: 141.5,
      rate_date: "2026-08-03",
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bank_code).toBe("ABY");
    expect(res.body.data.id).toBeTypeOf("string");
  });

  it("POST with a duplicate (bank, currency, date) responds 409", async () => {
    const res = await request(app).post("/api/v1/manual-rates").send({
      bank_code: "ABY",
      currency_code: "USD",
      buying_rate: 122,
      selling_rate: 123,
      rate_date: "2026-08-02",
    });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.data).toBeNull();
  });

  it("POST with an invalid body responds 422", async () => {
    const res = await request(app).post("/api/v1/manual-rates").send({
      bank_code: "ABY",
      currency_code: "USD",
      buying_rate: -1,
      selling_rate: 123,
      rate_date: "2026-08-02",
    });
    expect(res.status).toBe(422);
    expect(res.body.message).toContain("Invalid request body");
  });

  it("POST with an unknown key responds 422 (strict body)", async () => {
    const res = await request(app).post("/api/v1/manual-rates").send({
      bank_code: "ABY",
      currency_code: "USD",
      buying_rate: 122,
      selling_rate: 123,
      rate_date: "2026-08-02",
      typo_field: true,
    });
    expect(res.status).toBe(422);
  });

  it("PUT /api/v1/manual-rates/:id updates an existing rate", async () => {
    const created = await request(app).post("/api/v1/manual-rates").send({
      bank_code: "ABY",
      currency_code: "EUR",
      buying_rate: 140.5,
      selling_rate: 141.5,
      rate_date: "2026-08-03",
    });
    const id = created.body.data.id as string;

    const res = await request(app).put(`/api/v1/manual-rates/${id}`).send({ selling_rate: 142 });
    expect(res.status).toBe(200);
    expect(res.body.data.selling_rate).toBe(142);
  });

  it("DELETE /api/v1/manual-rates/:id removes a rate and responds 200", async () => {
    const created = await request(app).post("/api/v1/manual-rates").send({
      bank_code: "ABY",
      currency_code: "EUR",
      buying_rate: 140.5,
      selling_rate: 141.5,
      rate_date: "2026-08-03",
    });
    const id = created.body.data.id as string;

    const res = await request(app).delete(`/api/v1/manual-rates/${id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: "Manual rate deleted.",
      data: null,
    });

    const gone = await request(app).get(`/api/v1/manual-rates/${id}`);
    expect(gone.status).toBe(404);
  });

  it("rejects a non-UUID id with 422", async () => {
    const res = await request(app).put("/api/v1/manual-rates/not-a-uuid").send({ note: "x" });
    expect(res.status).toBe(422);
  });
});

describe("Scraper-health endpoints", () => {
  it("GET /api/v1/scraper-health returns the aggregate summary", async () => {
    const res = await request(app).get("/api/v1/scraper-health");
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      total: 4,
      healthy: 1,
      degraded: 1,
      failed: 1,
      unknown: 1,
      averageResponseTimeMs: 360,
      averageConsecutiveFailures: 1.75,
    });
  });

  it("GET /api/v1/scraper-health/:bankCode returns the row for a bank", async () => {
    const res = await request(app).get("/api/v1/scraper-health/ABY");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("unknown");
  });

  it("GET /api/v1/scraper-health/:bankCode returns null data when absent", async () => {
    const res = await request(app).get("/api/v1/scraper-health/NOPE");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });
});

describe("Scrape-log endpoints", () => {
  it("GET /api/v1/scrape-logs lists logs newest-first", async () => {
    const res = await request(app).get("/api/v1/scrape-logs");
    expect(res.status).toBe(200);
    expect(res.body.data.map((l: { id: string }) => l.id)).toEqual([
      "log-2",
      "log-1",
      "log-3",
      "log-4",
    ]);
  });

  it("GET /api/v1/scrape-logs filters by status and paginates", async () => {
    const res = await request(app).get("/api/v1/scrape-logs?status=success&limit=2");
    expect(res.status).toBe(200);
    expect(res.body.data.map((l: { id: string }) => l.id)).toEqual(["log-2", "log-1"]);
  });

  it("GET /api/v1/scrape-logs rejects an invalid status enum", async () => {
    const res = await request(app).get("/api/v1/scrape-logs?status=weird");
    expect(res.status).toBe(422);
  });

  it("GET /api/v1/scrape-logs rejects limit=0", async () => {
    const res = await request(app).get("/api/v1/scrape-logs?limit=0");
    expect(res.status).toBe(422);
  });

  it("GET /api/v1/scrape-logs/:runId returns logs for one run", async () => {
    const runId = "11111111-1111-4111-8111-111111111111";
    const logs = getFakeClient().tables.get("scrape_logs")!;
    logs.push({
      id: "log-5",
      run_id: runId,
      bank_code: "CBE",
      status: "success",
      scenario: "updated",
      currencies_count: 25,
      error_message: null,
      duration_ms: 1200,
      ran_at: "2026-08-02T08:01:00.000Z",
    });

    const res = await request(app).get(`/api/v1/scrape-logs/${runId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((l: { id: string }) => l.id)).toEqual(["log-5"]);
  });

  it("GET /api/v1/scrape-logs/:runId rejects a non-UUID runId", async () => {
    const res = await request(app).get("/api/v1/scrape-logs/not-a-uuid");
    expect(res.status).toBe(422);
  });
});

describe("Routing and error middleware", () => {
  it("returns 404 for unknown routes with the standard envelope", async () => {
    const res = await request(app).get("/api/v1/nonexistent");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "Route not found.",
      data: null,
    });
  });

  it("returns 500 with the error envelope when the database query fails", async () => {
    getFakeClient().nextError = { code: "PGRST116", message: "boom" };
    const res = await request(app).get("/api/v1/banks");
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.data).toBeNull();
  });
});

describe("Readiness probe", () => {
  it("GET /ready returns 200 with ready:true when the database is connected", async () => {
    const res = await request(app).get("/ready");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: "Server is ready.",
      data: { ready: true },
    });
  });

  it("GET /ready returns 503 when the database is unreachable", async () => {
    setDatabaseConnected(false);
    const res = await request(app).get("/ready");
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.data).toBeNull();
  });
});

describe("Request ids", () => {
  it("sets an X-Request-ID header on every response", async () => {
    const res = await request(app).get("/api/v1/banks");
    expect(res.headers["x-request-id"]).toBeTypeOf("string");
  });

  it("sets a different X-Request-ID per request", async () => {
    const first = await request(app).get("/api/v1/banks");
    const second = await request(app).get("/api/v1/banks");
    expect(first.headers["x-request-id"]).not.toBe(second.headers["x-request-id"]);
  });

  it("echoes a safe incoming X-Request-ID back in the response", async () => {
    const res = await request(app).get("/api/v1/banks").set("X-Request-ID", "proxy-trace-42");
    expect(res.headers["x-request-id"]).toBe("proxy-trace-42");
  });
});

describe("API documentation endpoints", () => {
  it("serves the raw OpenAPI document at /docs.json", async () => {
    const res = await request(app).get("/docs.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.1.0");
  });

  it("serves the Swagger UI at /docs", async () => {
    const res = await request(app).get("/docs");
    expect([200, 301, 302]).toContain(res.status);
  });
});

describe("Liveness probe", () => {
  it("GET /live returns 200 with alive:true without any database call", async () => {
    // The database is deliberately unreachable — /live must still answer 200.
    setDatabaseConnected(false);
    const res = await request(app).get("/live");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: "Server is alive.",
      data: { alive: true },
    });
  });
});

describe("Metrics endpoint", () => {
  it("GET /metrics returns Prometheus text with the standard content type", async () => {
    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.text).toContain("http_requests_total");
    expect(res.text).toContain("http_request_duration_seconds");
  });

  it("records real requests in the metrics", async () => {
    await request(app).get("/api/v1/banks");
    const res = await request(app).get("/metrics");
    expect(res.text).toContain(
      'http_requests_total{method="GET",route="/api/v1/banks",status_code="200"}',
    );
  });
});
