import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { ConflictError } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/lib/password";
import { CustomersRepository } from "@/repositories/CustomersRepository";
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

const VALID_PASSWORD = "StrongPassword123!";

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
 * Builds the real service wired to real repositories over one seeded
 * in-memory client, so assertions can inspect both the `users` and
 * `customers` tables exactly as the service wrote them.
 */
function makeService(seedUsers: UserRow[] = []) {
  const client = createFakeSupabaseClient({ users: [...seedUsers], customers: [] });
  const repository = new UsersRepository(client as unknown as SupabaseClient<Database>);
  const customersRepository = new CustomersRepository(
    client as unknown as SupabaseClient<Database>,
  );
  const service = new AuthServiceImpl(repository, customersRepository, config);
  return { service, client };
}

describe("AuthServiceImpl.register", () => {
  it("creates a customer user + profile and returns the public user shape", async () => {
    const { service, client } = makeService();

    const user = await service.register({
      email: "customer@example.com",
      password: VALID_PASSWORD,
      companyName: "Example Company",
      phone: "+251911000000",
    });

    expect(user).toMatchObject({
      email: "customer@example.com",
      role: "customer",
    });
    expect(user.id).toBeTypeOf("string");

    const stored = client.tables.get("users")!.find((u) => u.email === "customer@example.com");
    expect(stored).toBeDefined();
    expect(stored!.role).toBe("customer");

    const profile = client.tables.get("customers")![0];
    expect(profile).toMatchObject({
      user_id: stored!.id,
      company_name: "Example Company",
      phone: "+251911000000",
    });
  });

  it("never stores the plaintext password — only the scrypt hash", async () => {
    const { service, client } = makeService();

    await service.register({ email: "customer@example.com", password: VALID_PASSWORD });

    const stored = client.tables.get("users")!.find((u) => u.email === "customer@example.com");
    const passwordHash = stored?.password_hash as string;
    expect(passwordHash).not.toContain(VALID_PASSWORD);
    expect(passwordHash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    // The stored hash must verify against the original plaintext.
    expect(verifyPassword(VALID_PASSWORD, passwordHash)).toBe(true);
  });

  it("normalizes the email (trim + lowercase) consistently with login", async () => {
    const { service, client } = makeService();

    await service.register({ email: "  Customer@Example.COM ", password: VALID_PASSWORD });

    const stored = client.tables.get("users")!;
    expect(stored).toHaveLength(1);
    expect(stored[0]!.email).toBe("customer@example.com");
  });

  it("derives users.name from company_name when provided, else from the email local part", async () => {
    const { service, client } = makeService();

    await service.register({
      email: "with-company@example.com",
      password: VALID_PASSWORD,
      companyName: "Acme Ltd",
    });
    await service.register({ email: "no-company@example.com", password: VALID_PASSWORD });

    const names = client.tables
      .get("users")!
      .map((u) => u.name)
      .sort();
    expect(names).toEqual(["Acme Ltd", "no-company"]);
  });

  it("rejects a duplicate email with ConflictError and creates nothing", async () => {
    const seeded = [makeUser({ email: "taken@example.com" })];
    const { service, client } = makeService(seeded);

    await expect(
      service.register({ email: "taken@example.com", password: VALID_PASSWORD }),
    ).rejects.toBeInstanceOf(ConflictError);

    // No customer rows and no additional user rows were written.
    expect(client.tables.get("customers") ?? []).toHaveLength(0);
    expect(client.tables.get("users")).toHaveLength(1);
  });

  it("rejects a duplicate email case-insensitively (normalized comparison)", async () => {
    const seeded = [makeUser({ email: "taken@example.com" })];
    const { service, client } = makeService(seeded);

    await expect(
      service.register({ email: "  TAKEN@EXAMPLE.COM ", password: VALID_PASSWORD }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(client.tables.get("customers") ?? []).toHaveLength(0);
  });

  it("removes the just-created user row when the customers insert fails (no orphan)", async () => {
    const { service, client } = makeService();
    // One-shot error injection: the NEXT query fails. Query order inside
    // register: findByEmail → users.insert → customers.insert (fails here)
    // → compensating users delete.
    client.nextError = { code: "23505", message: "insert failed" };

    await expect(
      service.register({ email: "customer@example.com", password: VALID_PASSWORD }),
    ).rejects.toBeDefined();

    expect(client.tables.get("users") ?? []).toHaveLength(0);
    expect(client.tables.get("customers") ?? []).toHaveLength(0);
  });
});
