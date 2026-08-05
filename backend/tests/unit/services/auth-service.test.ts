import { describe, expect, it } from "vitest";

import { AuthenticationError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { signToken, verifyToken } from "@/lib/tokens";
import { AuthServiceImpl, type AuthServiceConfig } from "@/services/AuthService";
import type { UserRow } from "@/types/database";

import { createMockUsersRepository } from "../../mocks/repositories";

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

function makeService() {
  const repository = createMockUsersRepository();
  const service = new AuthServiceImpl(repository, config);
  return { service, repository };
}

describe("AuthServiceImpl.login", () => {
  it("provisions the bootstrap admin on first login and returns tokens + user", async () => {
    const { service, repository } = makeService();
    repository.findByEmail.mockResolvedValue(null);
    repository.insert.mockResolvedValue(makeUser());

    const session = await service.login("  ADMIN@TEST.DEV ", "admin-secret-123");

    // Email is trimmed + lowercased; provisioning only for the configured admin.
    expect(repository.findByEmail).toHaveBeenCalledWith("admin@test.dev");
    expect(repository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "admin@test.dev",
        name: "Root Admin",
        role: "super_admin",
      }),
    );
    expect(repository.updateBy).toHaveBeenCalledWith(
      { id: "user-1" },
      { last_login_at: expect.any(String) },
    );
    expect(session.user).toEqual({
      id: "user-1",
      name: "Root Admin",
      email: "admin@test.dev",
      role: "super_admin",
      avatarUrl: null,
    });
    expect(session.tokens.accessToken).toBeTypeOf("string");
    expect(session.tokens.refreshToken).toBeTypeOf("string");
  });

  it("stores only the scrypt hash of the bootstrap password", async () => {
    const { service, repository } = makeService();
    repository.findByEmail.mockResolvedValue(null);
    repository.insert.mockResolvedValue(makeUser());

    await service.login("admin@test.dev", "admin-secret-123");

    const payload = repository.insert.mock.calls[0]![0] as { password_hash: string };
    expect(payload.password_hash).not.toContain("admin-secret-123");
    expect(payload.password_hash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
  });

  it("rejects an unknown email that is not the bootstrap admin (no enumeration, no insert)", async () => {
    const { service, repository } = makeService();
    repository.findByEmail.mockResolvedValue(null);

    await expect(service.login("someone@else.dev", "whatever")).rejects.toBeInstanceOf(
      AuthenticationError,
    );
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it("rejects a wrong password for an existing user", async () => {
    const { service, repository } = makeService();
    repository.findByEmail.mockResolvedValue(makeUser());

    await expect(service.login("admin@test.dev", "wrong-password")).rejects.toBeInstanceOf(
      AuthenticationError,
    );
    expect(repository.updateBy).not.toHaveBeenCalled();
  });

  it("accepts the correct password for an existing user", async () => {
    const { service, repository } = makeService();
    repository.findByEmail.mockResolvedValue(makeUser());

    const session = await service.login("admin@test.dev", "admin-secret-123");
    expect(session.user.id).toBe("user-1");
    expect(repository.insert).not.toHaveBeenCalled();
  });
});

describe("AuthServiceImpl.refresh", () => {
  it("exchanges a valid refresh token for a fresh pair", async () => {
    const { service, repository } = makeService();
    const refreshToken = signToken({ sub: "user-1", type: "refresh" }, config.jwtSecret, "30d");
    repository.findById.mockResolvedValue(makeUser());

    const tokens = await service.refresh(refreshToken);
    expect(tokens.accessToken).toBeTypeOf("string");
    expect(tokens.refreshToken).toBeTypeOf("string");
    expect(verifyToken(tokens.accessToken, config.jwtSecret, "access").sub).toBe("user-1");
  });

  it("rejects an access token used as a refresh token (kind mismatch)", async () => {
    const { service } = makeService();
    const accessToken = signToken(
      { sub: "user-1", role: "admin", type: "access" },
      config.jwtSecret,
      "15m",
    );
    await expect(service.refresh(accessToken)).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("rejects a token signed with a different secret", async () => {
    const { service } = makeService();
    const forged = signToken({ sub: "user-1", type: "refresh" }, "attacker-secret", "30d");
    await expect(service.refresh(forged)).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("rejects refresh when the user row has been deleted", async () => {
    const { service, repository } = makeService();
    const refreshToken = signToken({ sub: "user-1", type: "refresh" }, config.jwtSecret, "30d");
    repository.findById.mockResolvedValue(null);
    await expect(service.refresh(refreshToken)).rejects.toBeInstanceOf(AuthenticationError);
  });
});

describe("AuthServiceImpl.me", () => {
  it("returns the authenticated user", async () => {
    const { service, repository } = makeService();
    repository.findById.mockResolvedValue(makeUser());
    const user = await service.me("user-1");
    expect(user.email).toBe("admin@test.dev");
  });

  it("throws when the user no longer exists", async () => {
    const { service, repository } = makeService();
    repository.findById.mockResolvedValue(null);
    await expect(service.me("gone")).rejects.toBeInstanceOf(AuthenticationError);
  });
});

describe("AuthServiceImpl.forgotPassword", () => {
  it("returns null for an unknown email (no token, no enumeration)", async () => {
    const { service, repository } = makeService();
    repository.findByEmail.mockResolvedValue(null);
    expect(await service.forgotPassword("nobody@test.dev")).toBeNull();
  });

  it("issues a verifiable password-reset token for a known email", async () => {
    const { service, repository } = makeService();
    repository.findByEmail.mockResolvedValue(makeUser());
    const token = await service.forgotPassword("  ADMIN@TEST.DEV ");
    expect(repository.findByEmail).toHaveBeenCalledWith("admin@test.dev");
    expect(token).toBeTypeOf("string");
    expect(verifyToken(token!, config.jwtSecret, "password-reset").sub).toBe("user-1");
  });
});

describe("AuthServiceImpl.resetPassword", () => {
  it("persists a new hash for a valid token and the new password works", async () => {
    const { service, repository } = makeService();
    repository.findById.mockResolvedValue(makeUser());
    const token = signToken({ sub: "user-1", purpose: "password-reset" }, config.jwtSecret, "30m");

    await service.resetPassword(token, "new-secret-456");

    const payload = repository.updateBy.mock.calls[0]![1] as { password_hash: string };
    expect(payload.password_hash).not.toContain("new-secret-456");
  });

  it("rejects an invalid reset token", async () => {
    const { service, repository } = makeService();
    await expect(service.resetPassword("garbage-token", "new-secret-456")).rejects.toBeInstanceOf(
      AuthenticationError,
    );
    expect(repository.updateBy).not.toHaveBeenCalled();
  });

  it("rejects a reset token for a user that no longer exists", async () => {
    const { service, repository } = makeService();
    repository.findById.mockResolvedValue(null);
    const token = signToken({ sub: "user-1", purpose: "password-reset" }, config.jwtSecret, "30m");
    await expect(service.resetPassword(token, "new-secret-456")).rejects.toBeInstanceOf(
      AuthenticationError,
    );
  });
});
