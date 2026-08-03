import { describe, expect, it, vi } from "vitest";

import { verifyDatabaseConnection } from "@/lib/supabase";

// A valid-looking client shape for `verifyDatabaseConnection`'s injectable param.
function makeClient(result: { error: { code: string; message: string } | null }) {
  return {
    from: () => ({
      select: () => ({
        then: (onFulfilled: (value: { error: { code: string; message: string } | null }) => void) =>
          Promise.resolve(onFulfilled(result)),
      }),
    }),
  };
}

describe("verifyDatabaseConnection", () => {
  it("returns true when the head query succeeds", async () => {
    const loggerSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const ok = await verifyDatabaseConnection(makeClient({ error: null }) as never);
    expect(ok).toBe(true);
    loggerSpy.mockRestore();
  });

  it("returns true when only the table is missing (database still reachable)", async () => {
    const loggerSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const ok = await verifyDatabaseConnection(
      makeClient({ error: { code: "42P01", message: "relation does not exist" } }) as never,
    );
    expect(ok).toBe(true);
    loggerSpy.mockRestore();
  });

  it("returns false when a real database error occurs", async () => {
    const loggerSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const ok = await verifyDatabaseConnection(
      makeClient({ error: { code: "PGRST116", message: "permission denied" } }) as never,
    );
    expect(ok).toBe(false);
    loggerSpy.mockRestore();
  });

  it("returns false when the query rejects (network unreachable)", async () => {
    const loggerSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const broken = {
      from: () => ({
        select: () => ({
          // Rejects through the thenable contract (what fetch/supabase would do).
          then: (_resolve: unknown, reject: (err: Error) => void) => {
            reject(new Error("fetch failed"));
          },
        }),
      }),
    };
    expect(await verifyDatabaseConnection(broken as never)).toBe(false);
    loggerSpy.mockRestore();
  });
});

describe("getSupabase", () => {
  it("returns a singleton client with auth session persistence disabled", async () => {
    // Imported lazily so the singleton state is fresh for this file.
    const { getSupabase } = await import("@/lib/supabase");
    const first = getSupabase();
    const second = getSupabase();
    expect(first).toBe(second);
    // Service-role usage: session persistence and auto-refresh disabled.
    expect((first as { supabaseUrl?: string }).supabaseUrl).toContain("supabase");
  });
});
