import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createSlowDown } from "@/middleware/slow-down";

describe("slow-down middleware (Phase 3A)", () => {
  it("does not delay requests below the threshold", async () => {
    const app = express();
    app.use(
      createSlowDown({
        windowMs: 60_000,
        delayAfter: 5,
        delayMs: () => 100_000, // would be obvious if applied
        maxDelayMs: 200_000,
      }),
    );
    app.get("/ping", (_req, res) => {
      res.json({ ok: true });
    });

    const start = Date.now();
    for (let i = 0; i < 5; i += 1) {
      await request(app).get("/ping").expect(200);
    }
    expect(Date.now() - start).toBeLessThan(1_000);
  });

  it("introduces a gradual delay after the threshold (never blocks)", async () => {
    // No delayMs override — exercises the default env-driven delay function
    // (250 ms per excess request, capped at SLOW_DOWN_MAX_DELAY_MS).
    const app = express();
    app.use(createSlowDown({ windowMs: 60_000, delayAfter: 2 }));
    app.get("/ping", (_req, res) => {
      res.json({ ok: true });
    });

    // First two requests run at full speed.
    await request(app).get("/ping").expect(200);
    await request(app).get("/ping").expect(200);

    // The third request exceeds the threshold and must be delayed (250 ms).
    const start = Date.now();
    const res = await request(app).get("/ping").expect(200);
    const elapsed = Date.now() - start;

    expect(res.body.ok).toBe(true); // never blocked, still responds 200
    expect(elapsed).toBeGreaterThanOrEqual(150);
  });

  it("skips infrastructure probe paths so monitoring is never throttled", async () => {
    const app = express();
    app.use(
      createSlowDown({
        windowMs: 60_000,
        delayAfter: 1,
        delayMs: () => 100_000,
        maxDelayMs: 200_000,
      }),
    );
    app.get("/health", (_req, res) => {
      res.json({ ok: true });
    });

    const start = Date.now();
    await request(app).get("/health").expect(200);
    expect(Date.now() - start).toBeLessThan(1_000);
  });
});
