import { describe, expect, it } from "vitest";

import { apiKeyIdParamsSchema, createApiKeyBodySchema } from "@/validators/customer-api-keys";

const VALID = { name: "Production API" };
const FUTURE = "2027-08-21T00:00:00.000Z";

describe("createApiKeyBodySchema", () => {
  it("accepts name only", () => {
    expect(createApiKeyBodySchema.safeParse(VALID).success).toBe(true);
  });

  it("accepts an optional expires_at and trims the name", () => {
    const parsed = createApiKeyBodySchema.safeParse({ ...VALID, expires_at: FUTURE });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.expires_at).toBe(FUTURE);
    }
  });

  it("trims surrounding whitespace from the name", () => {
    const parsed = createApiKeyBodySchema.safeParse({ name: "  Production API  " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.name).toBe("Production API");
  });

  it("rejects a missing or empty name", () => {
    expect(createApiKeyBodySchema.safeParse({}).success).toBe(false);
    expect(createApiKeyBodySchema.safeParse({ name: "" }).success).toBe(false);
    expect(createApiKeyBodySchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("rejects a name over 100 characters", () => {
    expect(createApiKeyBodySchema.safeParse({ name: "x".repeat(101) }).success).toBe(false);
  });

  it("rejects invalid expires_at values", () => {
    for (const bad of ["not-a-date", "2027-13-01", "2026-01-01"]) {
      const result = createApiKeyBodySchema.safeParse({ ...VALID, expires_at: bad });
      expect(result.success).toBe(false);
    }
  });

  it("rejects unknown keys — customer_id is NEVER accepted input", () => {
    const result = createApiKeyBodySchema.safeParse({
      ...VALID,
      customer_id: "99999999-9999-4999-8999-999999999999",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown keys generally (strict)", () => {
    expect(createApiKeyBodySchema.safeParse({ ...VALID, role: "admin" }).success).toBe(false);
  });
});

describe("apiKeyIdParamsSchema", () => {
  it("accepts a UUID id", () => {
    expect(
      apiKeyIdParamsSchema.safeParse({ id: "33333333-3333-4333-8333-333333333331" }).success,
    ).toBe(true);
  });

  it("rejects a non-UUID id", () => {
    expect(apiKeyIdParamsSchema.safeParse({ id: "not-a-uuid" }).success).toBe(false);
  });
});
