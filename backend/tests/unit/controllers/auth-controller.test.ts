import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { AuthController } from "@/controllers/AuthController";
import { AuthenticationError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { signToken } from "@/lib/tokens";
import { CustomersRepository } from "@/repositories/CustomersRepository";
import { UsersRepository } from "@/repositories/UsersRepository";
import { AuthServiceImpl, type AuthServiceConfig } from "@/services/AuthService";
import type { Database, UserRow } from "@/types/database";

import { createMockNext, createMockRequest, createMockResponse } from "../../helpers/http";
import { createFakeSupabaseClient } from "../../helpers/supabase-client";

const config: AuthServiceConfig = {
  jwtSecret: "unit-test-secret-0123456789",
  accessTokenExpiresIn: "15m",
  refreshTokenExpiresIn: "30d",
  passwordResetTokenExpiresIn: "30m",
  adminEmail: "a@b.dev",
  adminPassword: "secret",
};

function makeUser(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: "user-1",
    email: "a@b.dev",
    name: "Root Admin",
    role: "super_admin",
    password_hash: hashPassword("secret"),
    avatar_url: null,
    created_at: "2026-01-01T09:00:00.000Z",
    last_login_at: null,
    ...overrides,
  };
}

/** Builds the real controller over the real service wired to a seeded client. */
function makeController(seedUsers: UserRow[] = []) {
  const client = createFakeSupabaseClient({ users: [...seedUsers], customers: [] });
  const service = new AuthServiceImpl(
    new UsersRepository(client as unknown as SupabaseClient<Database>),
    new CustomersRepository(client as unknown as SupabaseClient<Database>),
    config,
  );
  const controller = new AuthController(service);
  return { service, controller };
}

describe("AuthController.login", () => {
  it("passes credentials through and returns the session envelope", async () => {
    const { controller } = makeController([]);
    const res = createMockResponse();

    controller.login(
      createMockRequest({ body: { email: "a@b.dev", password: "secret" } }),
      res,
      createMockNext(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.status).toHaveBeenCalledWith(200);
    const envelope = res.json.mock.calls[0]![0] as {
      success: boolean;
      data: { user: { email: string }; tokens: { accessToken: string } };
    };
    expect(envelope).toMatchObject({
      success: true,
      message: "Login successful.",
    });
    expect(envelope.data.user.email).toBe("a@b.dev");
    expect(envelope.data.tokens.accessToken).toBeTypeOf("string");
  });

  it("forwards authentication failures to next", async () => {
    const { controller } = makeController([makeUser()]);
    const next = createMockNext();

    controller.login(
      createMockRequest({ body: { email: "a@b.dev", password: "wrong" } }),
      createMockResponse(),
      next,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]![0]).toBeInstanceOf(AuthenticationError);
  });
});

describe("AuthController.refresh", () => {
  it("passes the refresh token through and returns the token pair", async () => {
    const { controller } = makeController([makeUser()]);
    const res = createMockResponse();
    const refreshToken = signToken({ sub: "user-1", type: "refresh" }, config.jwtSecret, "30d");

    controller.refresh(createMockRequest({ body: { refreshToken } }), res, createMockNext());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Tokens refreshed.",
      data: { accessToken: expect.any(String), refreshToken: expect.any(String) },
    });
  });
});

describe("AuthController.logout", () => {
  it("answers a stateless success", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.logout(createMockRequest(), res, createMockNext());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Logged out.",
      data: null,
    });
  });
});

describe("AuthController.me", () => {
  it("resolves the authenticated user attached by requireAuth", async () => {
    const { controller } = makeController([makeUser()]);
    const res = createMockResponse();
    const req = createMockRequest() as { user?: { id: string } };
    req.user = { id: "user-1" };

    controller.me(req, res, createMockNext());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Authenticated user retrieved.",
      data: expect.objectContaining({ id: "user-1", email: "a@b.dev" }),
    });
  });

  it("throws when no user is attached (route misconfiguration)", async () => {
    const { controller } = makeController();
    const next = createMockNext();

    controller.me(createMockRequest(), createMockResponse(), next);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(next.mock.calls[0][0]).toBeInstanceOf(AuthenticationError);
  });
});

describe("AuthController.forgotPassword", () => {
  it("never reveals whether the email exists (unknown → sent:true only)", async () => {
    const { controller } = makeController([]);
    const res = createMockResponse();

    controller.forgotPassword(
      createMockRequest({ body: { email: "nobody@b.dev" } }),
      res,
      createMockNext(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: { sent: true },
      }),
    );
  });

  it("never exposes the devToken in the HTTP response (even in non-production)", async () => {
    const { controller } = makeController([makeUser()]);
    const res = createMockResponse();

    controller.forgotPassword(
      createMockRequest({ body: { email: "a@b.dev" } }),
      res,
      createMockNext(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    const body = res.json.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(body.data).toEqual({ sent: true });
    expect(body.data).not.toHaveProperty("devToken");
  });
});

describe("AuthController.resetPassword", () => {
  it("passes token + password through and answers success", async () => {
    const { controller } = makeController([makeUser()]);
    const res = createMockResponse();
    const token = signToken({ sub: "user-1", purpose: "password-reset" }, config.jwtSecret, "30m");

    controller.resetPassword(
      createMockRequest({ body: { token, password: "new-secret" } }),
      res,
      createMockNext(),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Password updated.",
      data: null,
    });
  });
});
