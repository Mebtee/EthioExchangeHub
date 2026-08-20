import { describe, expect, it } from "vitest";

import {
  forgotPasswordBodySchema,
  loginBodySchema,
  refreshBodySchema,
  resetPasswordBodySchema,
} from "@/validators/auth";

describe("loginBodySchema", () => {
  it("accepts valid credentials", () => {
    const parsed = loginBodySchema.safeParse({ email: " a@b.dev ", password: "secret" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.email).toBe("a@b.dev");
  });

  it("rejects a malformed email", () => {
    expect(loginBodySchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
  });

  it("rejects an empty password", () => {
    expect(loginBodySchema.safeParse({ email: "a@b.dev", password: "" }).success).toBe(false);
  });

  it("rejects unknown keys (strict)", () => {
    const result = loginBodySchema.safeParse({
      email: "a@b.dev",
      password: "x",
      rememberMe: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("refreshBodySchema", () => {
  it("accepts a refresh token", () => {
    expect(refreshBodySchema.safeParse({ refreshToken: "abc" }).success).toBe(true);
  });

  it("rejects a missing refresh token", () => {
    expect(refreshBodySchema.safeParse({}).success).toBe(false);
  });
});

describe("forgotPasswordBodySchema", () => {
  it("accepts a valid email", () => {
    const parsed = forgotPasswordBodySchema.safeParse({ email: " a@b.dev " });
    expect(parsed.success).toBe(true);
  });

  it("rejects a malformed email", () => {
    expect(forgotPasswordBodySchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("resetPasswordBodySchema", () => {
  it("accepts a token and a password meeting complexity requirements", () => {
    const parsed = resetPasswordBodySchema.safeParse({ token: "t", password: "LongPass-1234" });
    expect(parsed.success).toBe(true);
  });

  it("rejects a short password", () => {
    expect(resetPasswordBodySchema.safeParse({ token: "t", password: "short" }).success).toBe(
      false,
    );
  });

  it("rejects a password missing complexity", () => {
    expect(resetPasswordBodySchema.safeParse({ token: "t", password: "alllowercase123" }).success).toBe(
      false,
    );
  });

  it("rejects an empty token", () => {
    expect(resetPasswordBodySchema.safeParse({ token: "", password: "LongPass-1234" }).success).toBe(
      false,
    );
  });
});
