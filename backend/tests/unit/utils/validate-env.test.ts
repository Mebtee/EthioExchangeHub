import { afterEach, describe, expect, it, vi } from "vitest";

import { validateEnv } from "@/utils/validate-env";

const required = {
  SUPABASE_URL: "https://x.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
  JWT_SECRET: "super-secret-value",
};

describe("validateEnv", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed values for a valid input", () => {
    const env = validateEnv({ ...required, PORT: "8080", LOG_LEVEL: "debug" });
    expect(env.PORT).toBe(8080);
    expect(env.LOG_LEVEL).toBe("debug");
    expect(env.NODE_ENV).toBe("development");
  });

  it("applies defaults for optional values", () => {
    const env = validateEnv({ ...required });
    expect(env.PORT).toBe(5000);
    expect(env.JWT_EXPIRES_IN).toBe("15m");
    expect(env.REFRESH_TOKEN_EXPIRES_IN).toBe("30d");
    expect(env.FRONTEND_URL).toBe("http://localhost:8080");
  });

  it("parses the Phase 3A security settings with safe defaults", () => {
    const env = validateEnv({ ...required });
    expect(env.BODY_LIMIT).toBe("1mb");
    expect(env.RATE_LIMIT_WINDOW_MS).toBe(900_000);
    expect(env.SLOW_DOWN_WINDOW_MS).toBe(900_000);
    expect(env.SLOW_DOWN_DELAY_AFTER).toBe(50);
    expect(env.TRUST_PROXY).toBe(0);
    expect(env.ALLOWED_ORIGINS).toEqual([]);

    const withOrigins = validateEnv({
      ...required,
      ALLOWED_ORIGINS: " http://a.example , http://b.example ",
    });
    expect(withOrigins.ALLOWED_ORIGINS).toEqual(["http://a.example", "http://b.example"]);

    expect(validateEnv({ ...required, TRUST_PROXY: "1" }).TRUST_PROXY).toBe(1);
    expect(validateEnv({ ...required, TRUST_PROXY: "true" }).TRUST_PROXY).toBe(true);
    expect(validateEnv({ ...required, BODY_LIMIT: "2mb" }).BODY_LIMIT).toBe("2mb");
  });

  it("rejects a malformed ALLOWED_ORIGINS entry at boot (fail fast)", () => {
    const exit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    // Missing scheme — z.string().url() rejects it, so boot must fail.
    expect(() => validateEnv({ ...required, ALLOWED_ORIGINS: "localhost:5173" })).toThrow(
      "process.exit called",
    );

    exit.mockRestore();
    stderr.mockRestore();
  });

  it("exits the process with a friendly message when required values are missing", () => {
    const exit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    expect(() => validateEnv({})).toThrow("process.exit called");
    expect(exit).toHaveBeenCalledWith(1);
    expect(stderr).toHaveBeenCalled();

    exit.mockRestore();
    stderr.mockRestore();
  });
});
