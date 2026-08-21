import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { AuthController } from "@/controllers/AuthController";
import { ConflictError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { CustomersRepository } from "@/repositories/CustomersRepository";
import { UsersRepository } from "@/repositories/UsersRepository";
import { AuthServiceImpl, type AuthServiceConfig } from "@/services/AuthService";
import type { Database, UserRow } from "@/types/database";

import {
  createMockNext,
  createMockRequest,
  createMockResponse,
  flushPromises,
} from "../../helpers/http";
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
    email: "taken@b.dev",
    name: "Existing",
    role: "customer",
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
  return { client, controller };
}

describe("AuthController.register", () => {
  it("returns a 201 envelope with the public user shape (no tokens, no hash)", async () => {
    const { controller } = makeController();
    const res = createMockResponse();

    controller.register(
      createMockRequest({
        body: {
          email: "customer@example.com",
          password: "StrongPassword123!",
          company_name: "Example Company",
          phone: "+251911000000",
        },
      }),
      res,
      createMockNext(),
    );
    await flushPromises();

    expect(res.status).toHaveBeenCalledWith(201);
    const envelope = res.json.mock.calls[0]![0] as {
      success: boolean;
      message: string;
      data: Record<string, unknown>;
    };
    expect(envelope.success).toBe(true);
    expect(envelope.message).toBe("Registration successful.");
    expect(envelope.data).toMatchObject({
      email: "customer@example.com",
      role: "customer",
    });
    // Sensitive fields must never appear in the response.
    expect(envelope.data).not.toHaveProperty("password_hash");
    expect(envelope.data).not.toHaveProperty("tokens");
  });

  it("forwards duplicate-email conflicts to next", async () => {
    const { controller } = makeController([makeUser()]);
    const next = createMockNext();

    controller.register(
      createMockRequest({ body: { email: "taken@b.dev", password: "StrongPassword123!" } }),
      createMockResponse(),
      next,
    );
    await flushPromises();

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]![0]).toBeInstanceOf(ConflictError);
  });
});
