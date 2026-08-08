import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { ContactRepository } from "@/repositories/ContactRepository";
import { ContactServiceImpl } from "@/services/ContactService";
import type { EmailService } from "@/services/EmailService";
import type { ContactMessageRow, Database } from "@/types/database";

import { contactMessages } from "../../fixtures/contact-messages";
import { createFakeSupabaseClient } from "../../helpers/supabase-client";

function makeService() {
  const client = createFakeSupabaseClient({ contact_messages: [...contactMessages] });
  const repo = new ContactRepository(client as unknown as SupabaseClient<Database>);
  const emailService = {
    sendContactNotification: vi.fn(async () => ({
      delivered: true,
      messageId: "sent-email-1",
    })),
  } as unknown as EmailService;
  return { client, service: new ContactServiceImpl(repo, emailService), emailService };
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

  it("persists the message first, then forwards it to the email service exactly once", async () => {
    const { service, emailService } = makeService();
    const created = await service.submitMessage(validInput);

    expect(emailService.sendContactNotification).toHaveBeenCalledTimes(1);
    expect(emailService.sendContactNotification).toHaveBeenCalledWith({
      messageId: created.id,
      name: "Abebe Kebede",
      email: "abebe@example.com",
      subject: "Question about historical rates",
      message: "Hello, could you share how far back the historical rate data goes?",
      createdAt: created.created_at,
    });
  });

  it("still returns the persisted row when the email provider fails to deliver", async () => {
    const { service, emailService } = makeService();
    emailService.sendContactNotification = vi.fn(async () => ({
      delivered: false,
      messageId: "nope",
    })) as unknown as EmailService["sendContactNotification"];

    const created = await service.submitMessage(validInput);
    expect(created.name).toBe("Abebe Kebede");
    expect(emailService.sendContactNotification).toHaveBeenCalledTimes(1);
  });

  it("never lets an email provider throw fail the submission", async () => {
    const { service, emailService } = makeService();
    emailService.sendContactNotification = vi.fn(async () => {
      throw new Error("provider exploded");
    }) as unknown as EmailService["sendContactNotification"];

    const created = await service.submitMessage(validInput);
    expect(created.name).toBe("Abebe Kebede");
  });

  it("propagates repository errors and never attempts an email", async () => {
    const client = createFakeSupabaseClient({ contact_messages: [...contactMessages] });
    client.nextError = { code: "PGRST301", message: "boom" };
    const repo = new ContactRepository(client as unknown as SupabaseClient<Database>);
    const emailService = {
      sendContactNotification: vi.fn(),
    } as unknown as EmailService;
    const service = new ContactServiceImpl(repo, emailService);

    await expect(service.submitMessage(validInput)).rejects.toThrow();
    expect(emailService.sendContactNotification).not.toHaveBeenCalled();
  });
});
