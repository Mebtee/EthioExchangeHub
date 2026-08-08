import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { ContactRepository } from "@/repositories/ContactRepository";
import { ContactServiceImpl } from "@/services/ContactService";
import type { ContactMessageRow, Database } from "@/types/database";

import { contactMessages } from "../../fixtures/contact-messages";
import { createFakeSupabaseClient } from "../../helpers/supabase-client";

function makeService() {
  const client = createFakeSupabaseClient({ contact_messages: [...contactMessages] });
  const repo = new ContactRepository(client as unknown as SupabaseClient<Database>);
  return { client, service: new ContactServiceImpl(repo) };
}

const validInput = {
  name: "  Abebe Kebede  ",
  email: "  abebe@example.com  ",
  subject: "  Question about historical rates  ",
  message: "  Hello, could you share how far back the historical rate data goes?  ",
};

describe("ContactServiceImpl.submitMessage", () => {
  it("normalizes (trims) the input and persists the message", async () => {
    const { service, client } = makeService();
    const created = await service.submitMessage(validInput);

    expect(created.name).toBe("Abebe Kebede");
    expect(created.email).toBe("abebe@example.com");
    expect(created.subject).toBe("Question about historical rates");
    expect(created.message).toBe(
      "Hello, could you share how far back the historical rate data goes?",
    );
    // The row is really persisted in the in-memory table.
    const stored = client.tables
      .get("contact_messages")!
      .find((r) => r.id === created.id) as unknown as ContactMessageRow;
    expect(stored?.name).toBe("Abebe Kebede");
  });

  it("stamps the creation timestamp", async () => {
    const { service } = makeService();
    const created = await service.submitMessage(validInput);
    expect(created.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("propagates repository errors", async () => {
    const client = createFakeSupabaseClient({ contact_messages: [...contactMessages] });
    client.nextError = { code: "PGRST301", message: "boom" };
    const repo = new ContactRepository(client as unknown as SupabaseClient<Database>);
    const service = new ContactServiceImpl(repo);
    await expect(service.submitMessage(validInput)).rejects.toThrow();
  });
});
