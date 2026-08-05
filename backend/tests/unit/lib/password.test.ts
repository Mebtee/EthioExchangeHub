import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/password";

describe("hashPassword / verifyPassword", () => {
  it("round-trips: a freshly hashed password verifies", () => {
    const stored = hashPassword("correct horse battery staple");
    expect(verifyPassword("correct horse battery staple", stored)).toBe(true);
  });

  it("rejects the wrong password", () => {
    const stored = hashPassword("right-password");
    expect(verifyPassword("wrong-password", stored)).toBe(false);
  });

  it("uses a unique salt per hash (same password → different stored values)", () => {
    const first = hashPassword("same-password");
    const second = hashPassword("same-password");
    expect(first).not.toBe(second);
  });

  it("stores the salt and hash in the salt:hash format", () => {
    const stored = hashPassword("x");
    const [salt, hash] = stored.split(":");
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    expect(hash).toMatch(/^[0-9a-f]{128}$/);
  });

  it("returns false for malformed stored values instead of throwing", () => {
    expect(verifyPassword("x", "")).toBe(false);
    expect(verifyPassword("x", "no-separator")).toBe(false);
    expect(verifyPassword("x", ":")).toBe(false);
    expect(verifyPassword("x", "salt:not-hex")).toBe(false);
  });

  it("is constant-time-safe (timingSafeEqual path, same length)", () => {
    const stored = hashPassword("abc");
    expect(verifyPassword("abc", stored)).toBe(true);
    expect(verifyPassword("abd", stored)).toBe(false);
  });
});
