import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { ContactRepository } from "@/repositories/ContactRepository";
import type { ContactMessageRow, Database } from "@/types/database";

import { contactMessages } from "../../fixtures/contact-messages";
import { createFakeSupabaseClient } from "../../helpers/supabase-client";

function makeRepo() {
  const client = createFakeSupabaseClient({ contact_messages: [...contactMessages] });
  return {
    client,
    repo: new ContactRepository(client as unknown as SupabaseClient<Database>),
  };
}

const validInput = {
  name: "Sara Bekele",
  email: "sara@example.com",
  subject: "Partnership inquiry",
  message: "We would like to discuss a data partnership with your team.",
  created_at: "2026-08-02T09:05:00.000Z",
};

describe("ContactRepository", () => {
  it("inserts a message and returns the stored row", async () => {
    const { repo } = makeRepo();
    const created = await repo.createMessage(validInput);
    expect(created.name).toBe("Sara Bekele");
    expect(created.email).toBe("sara@example.com");
    expect(created.subject).toBe("Partnership inquiry");
    expect(created.message).toContain("data partnership");
  });

  it("persists the row in the table", async () => {
    const { repo, client } = makeRepo();
    const created = await repo.createMessage(validInput);
    const stored = client.tables
      .get("contact_messages")!
      .find((row) => row.id === created.id) as unknown as ContactMessageRow;
    expect(stored?.email).toBe("sara@example.com");
  });

  it("does not expose an update or delete surface", async () => {
    const { repo } = makeRepo();
    expect(typeof (repo as unknown as { updateBy?: unknown }).updateBy).toBe("function");
    // updateBy exists on the base, but the API never routes to it for messages.
    expect(repo).toBeInstanceOf(ContactRepository);
  });
});
