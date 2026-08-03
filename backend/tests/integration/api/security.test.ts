/**
 * Phase 3A security-hardening integration tests.
 *
 * Runs the full HTTP stack (createApp) against the in-memory fake Supabase
 * client and verifies: helmet security headers, CORS allow-list behavior,
 * request size limits (413), malformed JSON (400), and the standard
 * rate-limit headers. Rate limits are configured very high in the test env so
 * the suite is never blocked — the 429 path is covered in unit tests.
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
import { defaultSeed, seedFakeClient, setDatabaseConnected } from "../../helpers/supabase";

const app = createApp();

beforeEach(() => {
  seedFakeClient(defaultSeed);
  setDatabaseConnected(true);
});

describe("Security headers (helmet)", () => {
  it("sets the hardened headers on every response", async () => {
    const res = await request(app).get("/api/v1/banks");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(res.headers["x-dns-prefetch-control"]).toBe("off");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("does not send HSTS in non-production environments", async () => {
    const res = await request(app).get("/api/v1/banks");
    expect(res.headers["strict-transport-security"]).toBeUndefined();
  });
});

describe("CORS", () => {
  it("allows every origin on the ALLOWED_ORIGINS allow-list", async () => {
    for (const origin of ["http://localhost:5173", "http://localhost:3000"]) {
      const res = await request(app).get("/api/v1/banks").set("Origin", origin);
      expect(res.headers["access-control-allow-origin"]).toBe(origin);
    }
  });

  it("rejects unknown origins (no Access-Control-Allow-Origin header)", async () => {
    const res = await request(app).get("/api/v1/banks").set("Origin", "https://evil.example");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("answers preflight with allowed methods and NO credentials (auth-free API)", async () => {
    const res = await request(app)
      .options("/api/v1/manual-rates")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "POST");

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-methods"]).toContain("POST");
    expect(res.headers["access-control-allow-credentials"]).toBeUndefined();
  });
});

// No Origin header — non-browser clients must be untouched by CORS.
describe("CORS non-browser clients", () => {
  it("passes through without an Origin header", async () => {
    const res = await request(app).get("/api/v1/banks");
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("Request size limits", () => {
  it("rejects an oversized JSON payload with 413", async () => {
    const oversized = {
      bank_code: "ABY",
      currency_code: "USD",
      buying_rate: 122,
      selling_rate: 123,
      rate_date: "2026-08-03",
      padding: "x".repeat(2 * 1024 * 1024), // > 1 MB JSON limit
    };

    const res = await request(app).post("/api/v1/manual-rates").send(oversized);

    expect(res.status).toBe(413);
    expect(res.body.success).toBe(false);
    expect(res.body.data).toBeNull();
  });

  it("rejects malformed JSON with 400 (no stack leak)", async () => {
    const res = await request(app)
      .post("/api/v1/manual-rates")
      .set("Content-Type", "application/json")
      .send("{ this is not valid json");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(JSON.stringify(res.body)).not.toContain("SyntaxError");
  });
});

describe("Compression", () => {
  it("gzip-compresses responses ≥ 1 KB when the client accepts gzip", async () => {
    const res = await request(app).get("/docs.json").set("Accept-Encoding", "gzip");
    expect(res.status).toBe(200);
    expect(res.headers["content-encoding"]).toBe("gzip");
  });
});

describe("Health endpoints bypass security throttling", () => {
  it.each(["/health", "/ready", "/live"])(
    "%s responds 200 with no rate-limit headers (exempt from throttling)",
    async (path) => {
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
      const hasRateLimitHeaders = Object.keys(res.headers).some((header) =>
        header.startsWith("ratelimit"),
      );
      expect(hasRateLimitHeaders).toBe(false);
    },
  );
});

describe("Rate limiting", () => {
  it("attaches standard RateLimit headers to API responses", async () => {
    const res = await request(app).get("/api/v1/banks");
    expect(res.status).toBe(200);
    expect(Object.keys(res.headers).some((header) => header.startsWith("ratelimit"))).toBe(true);
    expect(res.headers["x-ratelimit-limit"]).toBeUndefined();
  });

  it("applies the strict limiter to /metrics (middleware-ordering regression)", async () => {
    // The strict limiter must run BEFORE the /metrics route handler in
    // Express's stack — if it were registered after, no RateLimit headers
    // would appear. This guards the Phase 3A ordering fix.
    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(Object.keys(res.headers).some((header) => header.startsWith("ratelimit"))).toBe(true);
  });
});
