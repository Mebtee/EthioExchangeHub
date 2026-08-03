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
