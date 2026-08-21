import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";

import { API_KEY_SCHEME, generateApiKey, hashApiKey, verifyApiKey } from "@/lib/api-keys";

describe("generateApiKey", () => {
  it("uses the public eeh_live_ scheme", () => {
    const { key } = generateApiKey();
    expect(key.startsWith(API_KEY_SCHEME)).toBe(true);
    expect(key).toMatch(/^eeh_live_/);
  });

  it("carries 256 bits of CSPRNG entropy (32 bytes -> 43 base64url chars)", () => {
    const { key } = generateApiKey();
    const secret = key.slice(API_KEY_SCHEME.length);
    expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("never repeats a secret across many generations", () => {
    const keys = new Set(Array.from({ length: 500 }, () => generateApiKey().key));
    expect(keys.size).toBe(500);
  });

  it("returns a recognizable public prefix (scheme + first 8 secret chars)", () => {
    const { key, keyPrefix } = generateApiKey();
    expect(keyPrefix).toBe(key.slice(0, API_KEY_SCHEME.length + 8));
    expect(keyPrefix.startsWith(API_KEY_SCHEME)).toBe(true);
    // The prefix must not expose the whole secret.
    expect(keyPrefix.length).toBeLessThan(key.length);
  });
});

describe("hashApiKey", () => {
  it("is the SHA-256 hex digest of the complete key", () => {
    const key = `eeh_live_${randomBytes(32).toString("base64url")}`;
    const expected = createHash("sha256").update(key, "utf8").digest("hex");
    expect(hashApiKey(key)).toBe(expected);
    expect(hashApiKey(key)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs for different keys", () => {
    expect(hashApiKey("eeh_live_a")).not.toBe(hashApiKey("eeh_live_b"));
  });
});

describe("verifyApiKey", () => {
  it("accepts the exact key the digest was computed from", () => {
    const { key } = generateApiKey();
    expect(verifyApiKey(key, hashApiKey(key))).toBe(true);
  });

  it("rejects a wrong key and tampered secrets", () => {
    const { key } = generateApiKey();
    const storedHash = hashApiKey(key);
    expect(verifyApiKey(`${key}x`, storedHash)).toBe(false);
    expect(verifyApiKey(key.slice(0, -1), storedHash)).toBe(false);
    expect(verifyApiKey(key.replace(/.$/, key.at(-1) === "A" ? "B" : "A"), storedHash)).toBe(false);
  });

  it("answers false for malformed digests instead of throwing", () => {
    const { key } = generateApiKey();
    expect(verifyApiKey(key, "")).toBe(false);
    expect(verifyApiKey(key, "not-hex")).toBe(false);
  });
});
