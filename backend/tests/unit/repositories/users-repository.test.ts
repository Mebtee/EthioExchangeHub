import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { UsersRepository } from "@/repositories/UsersRepository";
import type { Database } from "@/types/database";

import { users } from "../../fixtures/users";
import { createFakeSupabaseClient } from "../../mocks/supabase-client";

function makeRepo(): UsersRepository {
  const client = createFakeSupabaseClient({ users: [...users] });
  return new UsersRepository(client as unknown as SupabaseClient<Database>);
}

describe("UsersRepository", () => {
  it("findByEmail returns the matching user", async () => {
    const user = await makeRepo().findByEmail("operator@ethioexchange.test");
    expect(user?.id).toBe("user-1");
    expect(user?.role).toBe("admin");
  });

  it("findByEmail is case-sensitive at the data layer (service normalizes)", async () => {
    const user = await makeRepo().findByEmail("OPERATOR@ethioexchange.test");
    expect(user).toBeNull();
  });

  it("findByEmail returns null for an unknown email", async () => {
    const user = await makeRepo().findByEmail("nobody@example.com");
    expect(user).toBeNull();
  });

  it("findById returns the matching user", async () => {
    const user = await makeRepo().findById("user-1");
    expect(user?.email).toBe("operator@ethioexchange.test");
  });

  it("findById returns null for an unknown id", async () => {
    const user = await makeRepo().findById("missing-user");
    expect(user).toBeNull();
  });
});
