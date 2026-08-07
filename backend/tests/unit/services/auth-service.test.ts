import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { AuthenticationError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { signToken, verifyToken } from "@/lib/tokens";
import { UsersRepository } from "@/repositories/UsersRepository";
import { AuthServiceImpl, type AuthServiceConfig } from "@/services/AuthService";
import type { Database, UserRow } from "@/types/database";

import { createFakeSupabaseClient } from "../../helpers/supabase-client";

const config: AuthServiceConfig = {
  jwtSecret: "unit-test-secret-0123456789",
  accessTokenExpiresIn: "15m",
  refreshTokenExpiresIn: "30d",
  passwordResetTokenExpiresIn: "30m",
  adminEmail: "admin@test.dev",
  adminPassword: "admin-secret-123",
};

function makeUser(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: "user-1",
    email: "admin@test.dev",
    name: "Root Admin",
    role: "super_admin",
    password_hash: hashPassword("admin-secret-123"),
    avatar_url: null,
    created_at: "2026-01-01T09:00:00.000Z",
    last_login_at: null,
    ...overrides,
  };
}

/**
 * Builds the real service wired to a real repository over a seeded in-memory
 * client. `seedUsers` controls what `findByEmail`/`findById` can resolve.
 */
function makeService(seedUsers: UserRow[] = []) {
  const client = createFakeSupabaseClient({ users: [...seedUsers] });
  const repository = new UsersRepository(client as unknown as SupabaseClient<Database>);
  const service = new AuthServiceImpl(repository, config);
  return { service, repository, client };
}

describe("AuthServiceImpl.login", () => {
  it("provisions the bootstrap admin on first login and returns tokens + user", async () => {
    const { service, client } = makeService([makeUser({ id: "seed-id", email: "other@test.dev" })]);
    const session = await service.login("  ADMIN@TEST.DEV ", "admin-secret-123");

    // Email is trimmed + lowercased; provisioning only for the configured admin.
    const stored = client.tables.get("users")!;
    const provisioned = stored.find((u) => u.email === "admin@test.dev");
    expect(provisioned).toBeDefined();
    expect(provisioned).toMatchObject({
      email: "admin@test.dev",
      name: "Root Admin",
      role: "super_admin",
    });
    // The bootstrap row's id is generated and last_login_at is stamped.
    expect(session.user).toMatchObject({
      email: "admin@test.dev",
      name: "Root Admin",
      role: "super_admin",
    });
    expect(session.user.id).toBeTypeOf("string");
    expect(session.tokens.accessToken).toBeTypeOf("string");
    expect(session.tokens.refreshToken).toBeTypeOf("string");
  });

  it("stores only the scrypt hash of the bootstrap password", async () => {
    const { service, client } = makeService([makeUser({ id: "seed-id", email: "other@test.dev" })]);
    await service.login("admin@test.dev", "admin-secret-123");

    const stored = client.tables.get("users")!.find((u) => u.email === "admin@test.dev");
    const passwordHash = stored?.password_hash as string;
    expect(passwordHash).not.toContain("admin-secret-123");
    expect(passwordHash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
  });

  it("rejects an unknown email that is not the bootstrap admin (no enumeration, no insert)", async () => {
    const { service, client } = makeService();
    await expect(service.login("someone@else.dev", "whatever")).rejects.toBeInstanceOf(
      AuthenticationError,
    );
    expect(client.tables.get("users") ?? []).toHaveLength(0);
  });

  it("rejects a wrong password for an existing user without stamping last_login_at", async () => {
    const { service, client } = makeService([makeUser()]);
    await expect(service.login("admin@test.dev", "wrong-password")).rejects.toBeInstanceOf(
      AuthenticationError,
    );
    const stored = client.tables.get("users")!.find((u) => u.id === "user-1");
    expect(stored?.last_login_at).toBeNull();
  });

  it("accepts the correct password for an existing user and stamps last_login_at", async () => {
    const { service, client } = makeService([makeUser()]);
    const session = await service.login("admin@test.dev", "admin-secret-123");
    expect(session.user.id).toBe("user-1");
    const stored = client.tables.get("users")!.find((u) => u.id === "user-1");
    expect(stored?.last_login_at).toBeTypeOf("string");
  });
});

describe("AuthServiceImpl.refresh", () => {
  it("exchanges a valid refresh token for a fresh pair", async () => {
    const { service } = makeService([makeUser()]);
    const refreshToken = signToken({ sub: "user-1", type: "refresh" }, config.jwtSecret, "30d");

    const tokens = await service.refresh(refreshToken);
    expect(tokens.accessToken).toBeTypeOf("string");
    expect(tokens.refreshToken).toBeTypeOf("string");
    expect(verifyToken(tokens.accessToken, config.jwtSecret, "access").sub).toBe("user-1");
  });

  it("rejects an access token used as a refresh token (kind mismatch)", async () => {
    const { service } = makeService([makeUser()]);
    const accessToken = signToken(
      { sub: "user-1", role: "admin", type: "access" },
      config.jwtSecret,
      "15m",
    );
    await expect(service.refresh(accessToken)).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("rejects a token signed with a different secret", async () => {
    const { service } = makeService([makeUser()]);
    const forged = signToken({ sub: "user-1", type: "refresh" }, "attacker-secret", "30d");
    await expect(service.refresh(forged)).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("rejects refresh when the user row has been deleted", async () => {
    const { service } = makeService([]);
    const refreshToken = signToken({ sub: "user-1", type: "refresh" }, config.jwtSecret, "30d");
    await expect(service.refresh(refreshToken)).rejects.toBeInstanceOf(AuthenticationError);
  });
});

describe("AuthServiceImpl.me", () => {
  it("returns the authenticated user", async () => {
    const { service } = makeService([makeUser()]);
    const user = await service.me("user-1");
    expect(user.email).toBe("admin@test.dev");
  });

  it("throws when the user no longer exists", async () => {
    const { service } = makeService([]);
    await expect(service.me("gone")).rejects.toBeInstanceOf(AuthenticationError);
  });
});

describe("AuthServiceImpl.forgotPassword", () => {
  it("returns null for an unknown email (no token, no enumeration)", async () => {
    const { service } = makeService([]);
    expect(await service.forgotPassword("nobody@test.dev")).toBeNull();
  });

  it("issues a verifiable password-reset token for a known email", async () => {
    const { service } = makeService([makeUser()]);
    const token = await service.forgotPassword("  ADMIN@TEST.DEV ");
    expect(token).toBeTypeOf("string");
    expect(verifyToken(token!, config.jwtSecret, "password-reset").sub).toBe("user-1");
  });
});

describe("AuthServiceImpl.resetPassword", () => {
  it("persists a new hash for a valid token and the new password works", async () => {
    const { service, client } = makeService([makeUser()]);
    const token = signToken({ sub: "user-1", purpose: "password-reset" }, config.jwtSecret, "30m");

    await service.resetPassword(token, "new-secret-456");

    const stored = client.tables.get("users")!.find((u) => u.id === "user-1");
    const passwordHash = stored?.password_hash as string;
    expect(passwordHash).not.toContain("new-secret-456");
  });

  it("rejects an invalid reset token without touching the stored hash", async () => {
    const seeded = makeUser();
    const { service, client } = makeService([seeded]);
    await expect(service.resetPassword("garbage-token", "new-secret-456")).rejects.toBeInstanceOf(
      AuthenticationError,
    );
    const stored = client.tables.get("users")!.find((u) => u.id === "user-1");
    expect(stored?.password_hash).toBe(seeded.password_hash);
  });

  it("rejects a reset token for a user that no longer exists", async () => {
    const { service } = makeService([]);
    const token = signToken({ sub: "user-1", purpose: "password-reset" }, config.jwtSecret, "30m");
    await expect(service.resetPassword(token, "new-secret-456")).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });
});
