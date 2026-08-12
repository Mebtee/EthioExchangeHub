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

import { hashPassword } from "@/lib/password";

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
  featuredContentId,
  getFakeClient,
  seedFakeClient,
  setDatabaseConnected,
} from "../../helpers/supabase";
import { featuredContentFixture, futureIso, pastIso } from "../../fixtures/featured-content";

const app = createApp();

beforeEach(() => {
  seedFakeClient(defaultSeed);
  setDatabaseConnected(true);
});

/**
 * Logs in as the bootstrap admin (provisioned on first login from the test
 * env) and returns the Authorization header for protected requests.
 */
async function adminAuth(): Promise<{ Authorization: string }> {
  const res = await request(app).post("/api/v1/auth/login").send({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  expect(res.status).toBe(200);
  const tokens = res.body.data.tokens as { accessToken: string };
  return { Authorization: `Bearer ${tokens.accessToken}` };
}

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
  it("GET /api/v1/rates/latest resolves one row per bank+currency (manual overrides included)", async () => {
    const res = await request(app).get("/api/v1/rates/latest");
    expect(res.status).toBe(200);
    // Scraped pairs (ABY/EUR, CBE/USD) plus manual-only/manual-newest pairs
    // (ABY/USD manual 08-02, CBE/EUR manual 08-01) — 4 resolved rows.
    expect(res.body.data).toHaveLength(4);
    expect(res.body.data[0]!.rate_date).toBe("2026-08-01");
  });

  it("GET /api/v1/rates/latest applies manual overrides to the resolved snapshot", async () => {
    const res = await request(app).get("/api/v1/rates/latest");
    const abyUsd = res.body.data.find(
      (r: { bank_code: string; currency_code: string }) =>
        r.bank_code === "ABY" && r.currency_code === "USD",
    );
    expect(abyUsd).toMatchObject({
      buying_rate: 121.4,
      selling_rate: 122.2,
      rate_date: "2026-08-02",
      source: "MANUAL",
    });
    // 08-02 (121.4) vs the resolved 08-01 (121.5) → (-0.1/121.5)*100 ≈ -0.08.
    expect(abyUsd.change).toBe(-0.08);
    // A pair with no scraped row appears from the manual entry alone.
    const cbeEur = res.body.data.find(
      (r: { bank_code: string; currency_code: string }) =>
        r.bank_code === "CBE" && r.currency_code === "EUR",
    );
    expect(cbeEur).toMatchObject({ source: "MANUAL", rate_date: "2026-08-01" });
  });

  it("GET /api/v1/rates/latest annotates every row with a boolean stale flag (D2)", async () => {
    const res = await request(app).get("/api/v1/rates/latest");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const row of res.body.data as Array<{ stale?: unknown }>) {
      expect(typeof row.stale).toBe("boolean");
    }
  });

  it("GET /api/v1/rates/latest?from=... filters by date range", async () => {
    const res = await request(app).get("/api/v1/rates/latest?from=2026-08-01");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(4);
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

  it("GET /api/v1/rates/latest/:bankCode/:currencyCode returns the newest single rate (manual override)", async () => {
    const res = await request(app).get("/api/v1/rates/latest/ABY/USD");
    expect(res.status).toBe(200);
    // The manual ABY/USD row (08-02) is newer than the scraped 08-01 row.
    expect(res.body.data.buying_rate).toBe(121.4);
    expect(res.body.data.rate_date).toBe("2026-08-02");
    expect(res.body.data.source).toBe("MANUAL");
  });

  it("GET /api/v1/rates/latest/:bankCode/:currencyCode rejects a bad currency code", async () => {
    const res = await request(app).get("/api/v1/rates/latest/ABY/usd");
    expect(res.status).toBe(422);
  });

  it("GET /api/v1/rates/date-range returns the bounds across scraped + manual rows", async () => {
    const res = await request(app).get("/api/v1/rates/date-range");
    expect(res.status).toBe(200);
    // Scraped rows span 2026-07-30..08-01; the manual ABY/USD override is 08-02.
    expect(res.body.data).toEqual({ min: "2026-07-30", max: "2026-08-02" });
  });

  it("GET /api/v1/rates/history/:bankCode/:currencyCode returns oldest-first history (manual override included)", async () => {
    const res = await request(app).get("/api/v1/rates/history/ABY/USD");
    expect(res.status).toBe(200);
    // Scraped 07-30 + 08-01, plus the manual ABY/USD override on 08-02.
    expect(res.body.data.map((r: { rate_date: string }) => r.rate_date)).toEqual([
      "2026-07-30",
      "2026-08-01",
      "2026-08-02",
    ]);
    expect(res.body.data[2]!.source).toBe("MANUAL");
    for (const row of res.body.data as Array<{ stale?: unknown }>) {
      expect(typeof row.stale).toBe("boolean");
    }
  });
});

describe("Contact endpoints", () => {
  const validBody = {
    name: "Abebe Kebede",
    email: "abebe@example.com",
    subject: "Question about historical rates",
    message: "Hello, could you share how far back the historical rate data goes?",
  };

  it("POST /api/v1/contact/messages persists a message and responds 201", async () => {
    const res = await request(app).post("/api/v1/contact/messages").send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Message received.");
    expect(res.body.data.id).toBeTypeOf("string");
    expect(res.body.data.name).toBe("Abebe Kebede");
    expect(res.body.data.email).toBe("abebe@example.com");
  });

  it("POST trims whitespace from the submitted fields", async () => {
    const res = await request(app).post("/api/v1/contact/messages").send({
      name: "  Abebe Kebede  ",
      email: "  abebe@example.com  ",
      subject: "  Question  ",
      message: "  Hello, this is a long enough message.  ",
    });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Abebe Kebede");
    expect(res.body.data.email).toBe("abebe@example.com");
    expect(res.body.data.subject).toBe("Question");
    expect(res.body.data.message).toBe("Hello, this is a long enough message.");
  });

  it("POST with missing fields responds 422", async () => {
    const res = await request(app).post("/api/v1/contact/messages").send({
      name: "Abebe Kebede",
    });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.data).toBeNull();
  });

  it("POST with an invalid email responds 422", async () => {
    const res = await request(app)
      .post("/api/v1/contact/messages")
      .send({ ...validBody, email: "not-an-email" });
    expect(res.status).toBe(422);
    expect(res.body.message).toContain("Invalid request body");
  });

  it("POST with a too-short message responds 422", async () => {
    const res = await request(app)
      .post("/api/v1/contact/messages")
      .send({ ...validBody, message: "Too short" });
    expect(res.status).toBe(422);
  });

  it("POST with an unknown key responds 422 (strict body)", async () => {
    const res = await request(app)
      .post("/api/v1/contact/messages")
      .send({ ...validBody, typo_field: true });
    expect(res.status).toBe(422);
  });
});

describe("Manual-rate endpoints", () => {
  it("GET /api/v1/manual-rates lists rows newest-first", async () => {
    const res = await request(app)
      .get("/api/v1/manual-rates")
      .set(await adminAuth());
    expect(res.status).toBe(200);
    expect(res.body.data.map((r: { rate_date: string }) => r.rate_date)).toEqual([
      "2026-08-02",
      "2026-08-01",
    ]);
  });

  it("POST /api/v1/manual-rates creates a rate and responds 201", async () => {
    const res = await request(app)
      .post("/api/v1/manual-rates")
      .set(await adminAuth())
      .send({
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
    const res = await request(app)
      .post("/api/v1/manual-rates")
      .set(await adminAuth())
      .send({
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
    const res = await request(app)
      .post("/api/v1/manual-rates")
      .set(await adminAuth())
      .send({
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
    const res = await request(app)
      .post("/api/v1/manual-rates")
      .set(await adminAuth())
      .send({
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
    const created = await request(app)
      .post("/api/v1/manual-rates")
      .set(await adminAuth())
      .send({
        bank_code: "ABY",
        currency_code: "EUR",
        buying_rate: 140.5,
        selling_rate: 141.5,
        rate_date: "2026-08-03",
      });
    const id = created.body.data.id as string;

    const res = await request(app)
      .put(`/api/v1/manual-rates/${id}`)
      .set(await adminAuth())
      .send({ selling_rate: 142 });
    expect(res.status).toBe(200);
    expect(res.body.data.selling_rate).toBe(142);
  });

  it("DELETE /api/v1/manual-rates/:id removes a rate and responds 200", async () => {
    const created = await request(app)
      .post("/api/v1/manual-rates")
      .set(await adminAuth())
      .send({
        bank_code: "ABY",
        currency_code: "EUR",
        buying_rate: 140.5,
        selling_rate: 141.5,
        rate_date: "2026-08-03",
      });
    const id = created.body.data.id as string;

    const res = await request(app)
      .delete(`/api/v1/manual-rates/${id}`)
      .set(await adminAuth());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: "Manual rate deleted.",
      data: null,
    });

    const gone = await request(app)
      .get(`/api/v1/manual-rates/${id}`)
      .set(await adminAuth());
    expect(gone.status).toBe(404);
  });

  it("rejects a non-UUID id with 422", async () => {
    const res = await request(app)
      .put("/api/v1/manual-rates/not-a-uuid")
      .set(await adminAuth())
      .send({ note: "x" });
    expect(res.status).toBe(422);
  });
});

describe("Featured-content endpoints", () => {
  it("GET /api/v1/featured returns the single eligible campaign (homepage hero)", async () => {
    const res = await request(app).get("/api/v1/featured");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(featuredContentId);
    expect(res.body.data.title).toBe("Awash Bank — Back-to-School Offer");
    expect(res.body.data.features).toHaveLength(2);
  });

  it("GET /api/v1/featured returns data null when nothing is eligible", async () => {
    seedFakeClient({ ...defaultSeed, featured_content: [] });
    const res = await request(app).get("/api/v1/featured");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it("GET /api/v1/featured hides an active campaign scheduled for the future", async () => {
    seedFakeClient({
      ...defaultSeed,
      featured_content: [featuredContentFixture({ start_at: futureIso() })],
    });
    const res = await request(app).get("/api/v1/featured");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it("GET /api/v1/featured hides an active campaign whose window has expired", async () => {
    seedFakeClient({
      ...defaultSeed,
      featured_content: [featuredContentFixture({ end_at: pastIso() })],
    });
    const res = await request(app).get("/api/v1/featured");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it("GET /api/v1/featured serves a campaign whose window is currently open", async () => {
    seedFakeClient({
      ...defaultSeed,
      featured_content: [
        featuredContentFixture({
          id: featuredContentId,
          start_at: pastIso(),
          end_at: futureIso(),
        }),
      ],
    });
    const res = await request(app).get("/api/v1/featured");
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(featuredContentId);
  });

  it("GET /api/v1/featured picks the lowest display_order among eligible campaigns", async () => {
    seedFakeClient({
      ...defaultSeed,
      featured_content: [
        featuredContentFixture({ id: "high-order", display_order: 5 }),
        featuredContentFixture({ id: "low-order", display_order: 1 }),
        featuredContentFixture({ id: "inactive-zero", display_order: 0, is_active: false }),
      ],
    });
    const res = await request(app).get("/api/v1/featured");
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("low-order");
  });

  it("GET /api/v1/featured breaks display_order ties by newest created_at", async () => {
    seedFakeClient({
      ...defaultSeed,
      featured_content: [
        featuredContentFixture({ id: "older", created_at: "2026-07-01T09:00:00.000Z" }),
        featuredContentFixture({ id: "newer", created_at: "2026-08-01T09:00:00.000Z" }),
      ],
    });
    const res = await request(app).get("/api/v1/featured");
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("newer");
  });

  it("POST /api/v1/featured/:id/click records a click and stays public (no auth)", async () => {
    const res = await request(app)
      .post(`/api/v1/featured/${featuredContentId}/click`)
      .send({ destination_type: "internal" });
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
    expect(getFakeClient().tables.get("featured_content_clicks")).toHaveLength(1);
  });

  it("POST click rejects a non-UUID id with 422", async () => {
    const res = await request(app).post("/api/v1/featured/not-a-uuid/click").send({});
    expect(res.status).toBe(422);
  });

  it("admin featured endpoints require auth (401 without a token)", async () => {
    const list = await request(app).get("/api/v1/admin/featured");
    expect(list.status).toBe(401);
    const create = await request(app).post("/api/v1/admin/featured").send({
      title: "X",
      image_url: "https://cdn.example.com/x.jpg",
      destination_url: "/x",
      destination_type: "internal",
    });
    expect(create.status).toBe(401);
  });

  it("admin CRUD flow: create, list, get, update, delete", async () => {
    const auth = await adminAuth();

    const created = await request(app).post("/api/v1/admin/featured").set(auth).send({
      title: "Dashen Bank — New Year Savings",
      image_url: "https://cdn.example.com/dashen.jpg",
      destination_url: "/offers/dashen-savings",
      destination_type: "internal",
      badge_text: "LIMITED",
    });
    expect(created.status).toBe(201);
    const id = created.body.data.id as string;
    expect(created.body.data.created_by).toBeTypeOf("string");
    expect(created.body.data.badge_text).toBe("LIMITED");

    const list = await request(app).get("/api/v1/admin/featured").set(auth);
    expect(list.status).toBe(200);
    expect(list.body.data.map((r: { id: string }) => r.id)).toEqual(
      expect.arrayContaining([id, featuredContentId]),
    );
    const withCount = list.body.data.find((r: { id: string }) => r.id === id) as {
      click_count: number;
    };
    expect(withCount.click_count).toBe(0);

    const one = await request(app).get(`/api/v1/admin/featured/${id}`).set(auth);
    expect(one.status).toBe(200);
    expect(one.body.data.title).toBe("Dashen Bank — New Year Savings");

    const updated = await request(app)
      .patch(`/api/v1/admin/featured/${id}`)
      .set(auth)
      .send({ title: "Renamed", is_active: false });
    expect(updated.status).toBe(200);
    expect(updated.body.data.title).toBe("Renamed");
    expect(updated.body.data.is_active).toBe(false);

    const deleted = await request(app).delete(`/api/v1/admin/featured/${id}`).set(auth);
    expect(deleted.status).toBe(200);
    expect(deleted.body.data).toBeNull();

    const gone = await request(app).get(`/api/v1/admin/featured/${id}`).set(auth);
    expect(gone.status).toBe(404);
  });

  it("admin create rejects an invalid destination URL with 422", async () => {
    const res = await request(app)
      .post("/api/v1/admin/featured")
      .set(await adminAuth())
      .send({
        title: "Bad campaign",
        image_url: "javascript:alert(1)",
        destination_url: "offers/x",
        destination_type: "internal",
      });
    expect(res.status).toBe(422);
    expect(res.body.data).toBeNull();
  });
});

describe("Scraper-health endpoints", () => {
  it("GET /api/v1/scraper-health returns the aggregate summary (derived from scrape logs)", async () => {
    const res = await request(app).get("/api/v1/scraper-health");
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      total: 3,
      healthy: 2,
      degraded: 0,
      failed: 1,
      unknown: 0,
    });
    // D2: staleCount is always present (value is time-dependent here).
    expect(typeof res.body.data.staleCount).toBe("number");
  });

  it("GET /api/v1/scraper-health/list returns every row alphabetically", async () => {
    const res = await request(app).get("/api/v1/scraper-health/list");
    expect(res.status).toBe(200);
    expect(res.body.data.map((r: { bank_code: string }) => r.bank_code)).toEqual([
      "ABY",
      "CBE",
      "DASH",
    ]);
  });

  it("GET /api/v1/scraper-health/:bankCode returns the row for a bank", async () => {
    const res = await request(app).get("/api/v1/scraper-health/ABY");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("healthy");
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

describe("Admin profile endpoints", () => {
  it("GET /api/v1/admin/profile returns the authenticated user's real profile", async () => {
    const res = await request(app)
      .get("/api/v1/admin/profile")
      .set(await adminAuth());
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      name: "Root Admin",
      initials: "RA",
      role: "super_admin",
    });
    expect(res.body.data.memberSince).toBeTypeOf("string");
    expect(res.body.data.lastLogin).toBeTypeOf("string");
  });

  it("PUT /api/v1/admin/profile persists changes and the next GET reflects them", async () => {
    const res = await request(app)
      .put("/api/v1/admin/profile")
      .set(await adminAuth())
      .send({ name: "Jane Doe", email: "jane@example.com" });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Jane Doe");
    expect(res.body.data.email).toBe("jane@example.com");
    expect(res.body.data.initials).toBe("JD");

    // The email is the login identifier, so the follow-up signs in with the
    // updated email — the stored profile is re-read from the users row.
    const login = await request(app).post("/api/v1/auth/login").send({
      email: "jane@example.com",
      password: process.env.ADMIN_PASSWORD,
    });
    expect(login.status).toBe(200);
    const tokens = login.body.data.tokens as { accessToken: string };
    const after = await request(app)
      .get("/api/v1/admin/profile")
      .set({ Authorization: `Bearer ${tokens.accessToken}` });
    expect(after.body.data.name).toBe("Jane Doe");
  });

  it("PUT /api/v1/admin/profile rejects an empty body and unknown keys with 422", async () => {
    const empty = await request(app)
      .put("/api/v1/admin/profile")
      .set(await adminAuth())
      .send({});
    expect(empty.status).toBe(422);

    const unknown = await request(app)
      .put("/api/v1/admin/profile")
      .set(await adminAuth())
      .send({ name: "Jane", typo_field: true });
    expect(unknown.status).toBe(422);
  });
});

describe("Admin settings endpoints", () => {
  it("GET /api/v1/admin/settings returns persisted values merged with defaults", async () => {
    const res = await request(app)
      .get("/api/v1/admin/settings")
      .set(await adminAuth());
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      siteName: "Ethio Exchange Hub",
      defaultCurrency: "USD",
      emailAlerts: true,
      weeklyReport: false,
      timezone: "Africa/Addis_Ababa",
    });
  });

  it("PUT /api/v1/admin/settings persists booleans and strings", async () => {
    const res = await request(app)
      .put("/api/v1/admin/settings")
      .set(await adminAuth())
      .send({ weeklyReport: true, siteName: "New Hub" });
    expect(res.status).toBe(200);
    expect(res.body.data.weeklyReport).toBe(true);
    expect(res.body.data.siteName).toBe("New Hub");

    const after = await request(app)
      .get("/api/v1/admin/settings")
      .set(await adminAuth());
    expect(after.body.data.siteName).toBe("New Hub");
    expect(after.body.data.weeklyReport).toBe(true);
  });

  it("PUT /api/v1/admin/settings rejects a non-boolean alert value with 422", async () => {
    const res = await request(app)
      .put("/api/v1/admin/settings")
      .set(await adminAuth())
      .send({ emailAlerts: "yes" });
    expect(res.status).toBe(422);
  });
});

describe("Admin rate-trend endpoint", () => {
  it("GET /api/v1/admin/dashboard/rate-trend aggregates by rate date", async () => {
    const res = await request(app)
      .get("/api/v1/admin/dashboard/rate-trend")
      .set(await adminAuth());
    expect(res.status).toBe(200);
    expect(res.body.data.map((p: { label: string }) => p.label)).toEqual([
      "2026-07-30",
      "2026-08-01",
    ]);
    expect(res.body.data[1]).toEqual({ label: "2026-08-01", cashBuying: 127, cashSelling: 128.17 });
  });

  it("GET /api/v1/admin/dashboard/rate-trend?days=1 returns only the newest point", async () => {
    const res = await request(app)
      .get("/api/v1/admin/dashboard/rate-trend?days=1")
      .set(await adminAuth());
    expect(res.status).toBe(200);
    expect(res.body.data.map((p: { label: string }) => p.label)).toEqual(["2026-08-01"]);
  });

  it("GET /api/v1/admin/dashboard/rate-trend?currency=USD averages USD rows only", async () => {
    const res = await request(app)
      .get("/api/v1/admin/dashboard/rate-trend?currency=USD")
      .set(await adminAuth());
    expect(res.status).toBe(200);
    // 2026-08-01 USD-only: buying mean (121.5+119.5)/2 = 120.5 (EUR row excluded)
    expect(res.body.data[1]).toEqual({
      label: "2026-08-01",
      cashBuying: 120.5,
      cashSelling: 121.5,
    });
  });

  it("GET /api/v1/admin/dashboard/rate-trend rejects invalid params", async () => {
    const badDays = await request(app)
      .get("/api/v1/admin/dashboard/rate-trend?days=0")
      .set(await adminAuth());
    expect(badDays.status).toBe(422);

    const badCurrency = await request(app)
      .get("/api/v1/admin/dashboard/rate-trend?currency=usd")
      .set(await adminAuth());
    expect(badCurrency.status).toBe(422);
  });
});

describe("Auth endpoints", () => {
  it("POST /auth/login provisions the bootstrap admin and returns tokens + user", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeTypeOf("string");
    expect(res.body.data.tokens.refreshToken).toBeTypeOf("string");
    expect(res.body.data.user).toMatchObject({
      email: process.env.ADMIN_EMAIL,
      name: "Root Admin",
      role: "super_admin",
    });
    expect(res.body.data.user.id).toBeTypeOf("string");
  });

  it("POST /auth/login rejects a wrong password with 401", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: process.env.ADMIN_EMAIL,
      password: "definitely-wrong",
    });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      message: "Invalid email or password.",
      data: null,
    });
  });

  it("POST /auth/login rejects an unknown email identically (no enumeration)", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "nobody@example.com",
      password: "whatever",
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password.");
  });

  it("POST /auth/login rejects a malformed email with 422", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "not-an-email", password: "x" });
    expect(res.status).toBe(422);
  });

  it("GET /auth/me requires a token (401 without one)", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("GET /auth/me resolves the authenticated user with a valid token", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });
    const token = login.body.data.tokens.accessToken as string;

    const res = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ email: process.env.ADMIN_EMAIL, role: "super_admin" });
  });

  it("POST /auth/refresh exchanges a refresh token for a fresh pair", async () => {
    const login = await request(app).post("/api/v1/auth/login").send({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });
    const refreshToken = login.body.data.tokens.refreshToken as string;

    const res = await request(app).post("/api/v1/auth/refresh").send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTypeOf("string");
    expect(res.body.data.refreshToken).toBeTypeOf("string");
  });

  it("POST /auth/refresh rejects a garbage token with 401", async () => {
    const res = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: "garbage" });
    expect(res.status).toBe(401);
  });

  it("POST /auth/logout answers a stateless success", async () => {
    const res = await request(app).post("/api/v1/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it("POST /auth/forgot-password never reveals whether the email exists", async () => {
    // Log in first so the bootstrap admin exists and the known-email branch
    // actually issues a token (the unknown-email branch answers identically).
    await request(app).post("/api/v1/auth/login").send({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });

    const known = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: process.env.ADMIN_EMAIL });
    expect(known.status).toBe(200);
    expect(known.body.data.sent).toBe(true);
    // Non-production build: the genuinely issued token is returned as devToken.
    expect(known.body.data.devToken).toBeTypeOf("string");

    const unknown = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "nobody@example.com" });
    expect(unknown.status).toBe(200);
    expect(unknown.body.data).toEqual({ sent: true });
  });

  it("POST /auth/reset-password changes the password (old stops working, new works)", async () => {
    // Provision the bootstrap admin so forgot-password issues a real token.
    await request(app).post("/api/v1/auth/login").send({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });
    const forgot = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: process.env.ADMIN_EMAIL });
    const devToken = forgot.body.data.devToken as string;

    const reset = await request(app)
      .post("/api/v1/auth/reset-password")
      .send({ token: devToken, password: "brand-new-password-456" });
    expect(reset.status).toBe(200);

    const oldLogin = await request(app).post("/api/v1/auth/login").send({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app).post("/api/v1/auth/login").send({
      email: process.env.ADMIN_EMAIL,
      password: "brand-new-password-456",
    });
    expect(newLogin.status).toBe(200);
  });
});

describe("Route protection (A2)", () => {
  it("admin endpoints return 401 without a bearer token", async () => {
    const res = await request(app).get("/api/v1/admin/profile");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      message: "Authentication required.",
      data: null,
    });
  });

  it("manual-rate writes return 401 without a bearer token", async () => {
    const res = await request(app).post("/api/v1/manual-rates").send({
      bank_code: "ABY",
      currency_code: "USD",
      buying_rate: 122,
      selling_rate: 123,
      rate_date: "2026-08-02",
    });
    expect(res.status).toBe(401);
  });

  it("admin endpoints accept a valid admin token", async () => {
    const res = await request(app)
      .get("/api/v1/admin/profile")
      .set(await adminAuth());
    expect(res.status).toBe(200);
  });

  it("non-admin roles are rejected with 403", async () => {
    const client = getFakeClient();
    client.tables.get("users")!.push({
      id: "user-viewer",
      email: "viewer@ethioexchange.test",
      name: "Viewer",
      role: "viewer",
      password_hash: hashPassword("viewer-password-123"),
      avatar_url: null,
      created_at: "2026-01-01T09:00:00.000Z",
      last_login_at: null,
    });
    const login = await request(app).post("/api/v1/auth/login").send({
      email: "viewer@ethioexchange.test",
      password: "viewer-password-123",
    });
    expect(login.status).toBe(200);
    const viewerToken = login.body.data.tokens.accessToken as string;

    const res = await request(app)
      .get("/api/v1/admin/profile")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      success: false,
      message: "You do not have permission to perform this action.",
      data: null,
    });
  });

  it("manual-rate writes accept a valid admin token", async () => {
    const res = await request(app)
      .post("/api/v1/manual-rates")
      .set(await adminAuth())
      .send({
        bank_code: "ABY",
        currency_code: "EUR",
        buying_rate: 140.5,
        selling_rate: 141.5,
        rate_date: "2026-08-03",
      });
    expect(res.status).toBe(201);
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
