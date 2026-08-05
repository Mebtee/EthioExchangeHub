import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import {
  createAuthLimiter,
  createGeneralLimiter,
  createStrictLimiter,
} from "@/middleware/rate-limit";

/** Tiny app that mounts a limiter in front of one route (real HTTP stack). */
function buildApp(limiter: ReturnType<typeof createGeneralLimiter>) {
  const app = express();
  app.use(limiter);
  app.get("/ping", (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe("rate-limit middleware (Phase 3A)", () => {
  it("returns 429 with the error envelope once the limit is exceeded", async () => {
    const app = buildApp(createGeneralLimiter({ windowMs: 60_000, limit: 2 }));

    await request(app).get("/ping").expect(200);
    await request(app).get("/ping").expect(200);
    const res = await request(app).get("/ping");

    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      success: false,
      message: "Too many requests, please try again later.",
      data: null,
    });
  });

  it("emits standard RateLimit headers and omits legacy X-RateLimit headers", async () => {
    const app = buildApp(createGeneralLimiter({ windowMs: 60_000, limit: 5 }));

    const res = await request(app).get("/ping");

    expect(res.status).toBe(200);
    expect(res.headers["x-ratelimit-limit"]).toBeUndefined();
    expect(res.headers["x-ratelimit-remaining"]).toBeUndefined();
    expect(res.headers["x-ratelimit-reset"]).toBeUndefined();
    const hasStandardHeaders = Object.keys(res.headers).some((header) =>
      header.startsWith("ratelimit"),
    );
    expect(hasStandardHeaders).toBe(true);
  });

  it("exposes a stricter limiter for /docs and /metrics", async () => {
    const app = buildApp(createStrictLimiter({ windowMs: 60_000, limit: 1 }));

    await request(app).get("/ping").expect(200);
    await request(app).get("/ping").expect(429);
  });

  it("exposes a dedicated tighter limiter for /auth (brute-force protection)", async () => {
    const app = buildApp(createAuthLimiter({ windowMs: 60_000, limit: 2 }));

    await request(app).get("/ping").expect(200);
    await request(app).get("/ping").expect(200);
    await request(app).get("/ping").expect(429);
  });

  it("defaults come from the environment (used by createApp)", () => {
    const general = createGeneralLimiter();
    const strict = createStrictLimiter();
    const auth = createAuthLimiter();
    expect(typeof general).toBe("function");
    expect(typeof strict).toBe("function");
    expect(typeof auth).toBe("function");
  });
});
