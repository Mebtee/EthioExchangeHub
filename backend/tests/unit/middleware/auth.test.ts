import { describe, expect, it } from "vitest";

import { AuthenticationError, AuthorizationError } from "@/lib/errors";
import { signToken } from "@/lib/tokens";
import { createRequireAuth, requireRole } from "@/middleware/auth";

import { createMockNext, createMockRequest, createMockResponse } from "../../mocks/express";
import { createMockUsersRepository } from "../../mocks/repositories";

// Matches tests/setup/env.ts — the validated env singleton the middleware reads.
const TEST_SECRET = "test-secret-that-is-long-enough";

function makeUser() {
  return {
    id: "user-1",
    email: "admin@ethioexchange.test",
    name: "Root Admin",
    role: "super_admin",
    password_hash: "salt:hash",
    avatar_url: null,
    created_at: "2026-01-01T09:00:00.000Z",
    last_login_at: null,
  };
}

describe("createRequireAuth", () => {
  it("attaches the authenticated user and calls next for a valid Bearer token", async () => {
    const repository = createMockUsersRepository();
    repository.findById.mockResolvedValue(makeUser());
    const requireAuth = createRequireAuth(repository);
    const req = createMockRequest({
      headers: {
        authorization: `Bearer ${signToken({ sub: "user-1", role: "super_admin", type: "access" }, TEST_SECRET, "15m")}`,
      },
    });
    const next = createMockNext();

    requireAuth(req, createMockResponse(), next);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(repository.findById).toHaveBeenCalledWith("user-1");
    expect(req.user).toEqual({
      id: "user-1",
      name: "Root Admin",
      email: "admin@ethioexchange.test",
      role: "super_admin",
      avatarUrl: null,
    });
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects a request without an Authorization header", async () => {
    const requireAuth = createRequireAuth(createMockUsersRepository());
    const next = createMockNext();

    requireAuth(createMockRequest(), createMockResponse(), next);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const error = next.mock.calls[0]![0];
    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.message).toBe("Authentication required.");
  });

  it("rejects a non-Bearer Authorization header", async () => {
    const requireAuth = createRequireAuth(createMockUsersRepository());
    const next = createMockNext();

    requireAuth(
      createMockRequest({ headers: { authorization: "Basic abc123" } }),
      createMockResponse(),
      next,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(next.mock.calls[0]![0]).toBeInstanceOf(AuthenticationError);
  });

  it("rejects a garbage token", async () => {
    const requireAuth = createRequireAuth(createMockUsersRepository());
    const next = createMockNext();

    requireAuth(
      createMockRequest({ headers: { authorization: "Bearer not.a.jwt" } }),
      createMockResponse(),
      next,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const error = next.mock.calls[0]![0];
    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.message).toBe("Invalid or expired token.");
  });

  it("rejects a refresh token used as an access token (kind mismatch)", async () => {
    const requireAuth = createRequireAuth(createMockUsersRepository());
    const next = createMockNext();

    requireAuth(
      createMockRequest({
        headers: {
          authorization: `Bearer ${signToken({ sub: "user-1", type: "refresh" }, TEST_SECRET, "30d")}`,
        },
      }),
      createMockResponse(),
      next,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(next.mock.calls[0]![0]).toBeInstanceOf(AuthenticationError);
  });

  it("rejects a token whose user row has been deleted", async () => {
    const repository = createMockUsersRepository();
    repository.findById.mockResolvedValue(null);
    const requireAuth = createRequireAuth(repository);
    const next = createMockNext();

    requireAuth(
      createMockRequest({
        headers: {
          authorization: `Bearer ${signToken({ sub: "user-1", role: "super_admin", type: "access" }, TEST_SECRET, "15m")}`,
        },
      }),
      createMockResponse(),
      next,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const error = next.mock.calls[0]![0];
    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.message).toBe("Session user no longer exists.");
  });
});

describe("requireRole", () => {
  it("allows a user whose role is in the allowed list", () => {
    const req = createMockRequest() as { user?: { role: string } };
    req.user = { role: "super_admin" };
    const next = createMockNext();

    requireRole("admin", "super_admin")(req, createMockResponse(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects a user whose role is not allowed with 403", () => {
    const req = createMockRequest() as { user?: { role: string } };
    req.user = { role: "viewer" };
    const next = createMockNext();

    requireRole("admin", "super_admin")(req, createMockResponse(), next);
    const error = next.mock.calls[0]![0];
    expect(error).toBeInstanceOf(AuthorizationError);
  });

  it("rejects a request with no authenticated user", () => {
    const next = createMockNext();
    requireRole("admin")(createMockRequest(), createMockResponse(), next);
    const error = next.mock.calls[0]![0];
    expect(error).toBeInstanceOf(AuthorizationError);
  });
});
