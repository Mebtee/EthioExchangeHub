import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ResendEmailService } from "@/services/EmailService";

const emailState = vi.hoisted(() => {
  const send = vi.fn();
  const Resend = vi.fn(function ResendMock() {
    return { emails: { send } };
  });
  return { send, Resend };
});

vi.mock("resend", () => ({ Resend: emailState.Resend }));

const config = {
  apiKey: "re_test_key",
  fromEmail: "no-reply@ethioexchange.dev",
  toEmail: "ethioexchanges@gmail.com",
};

const input = {
  messageId: "a1b2c3d4-0000-4000-8000-000000000000",
  name: "Abebe Kebede",
  email: "abebe@example.com",
  subject: "Question about rates",
  message: "Hello, how far back does the historical rate data go?",
  createdAt: "2026-08-02T09:05:00.000Z",
};

function makeService(overrides?: Partial<typeof config>) {
  return new ResendEmailService({ ...config, ...overrides });
}

describe("ResendEmailService.sendContactNotification", () => {
  beforeEach(() => {
    emailState.send.mockReset();
    emailState.send.mockResolvedValue({ data: { id: "email-1" }, error: null });
    emailState.Resend.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the message once with to/from/reply-to, subject, bodies and idempotency key", async () => {
    const result = await makeService().sendContactNotification(input);

    expect(result).toEqual({ delivered: true, messageId: input.messageId });
    expect(emailState.Resend).toHaveBeenCalledTimes(1);
    expect(emailState.Resend).toHaveBeenCalledWith("re_test_key");
    expect(emailState.send).toHaveBeenCalledTimes(1);
    expect(emailState.send).toHaveBeenCalledWith(
      {
        from: "no-reply@ethioexchange.dev",
        to: "ethioexchanges@gmail.com",
        replyTo: "abebe@example.com",
        subject: "[Ethio ExchangeHub Contact] Question about rates",
        text: expect.stringContaining("Name: Abebe Kebede"),
        html: expect.stringContaining("Abebe Kebede"),
      },
      { idempotencyKey: `contact-${input.messageId}` },
    );
  });

  it("includes the message and submission timestamp in the plain-text body", async () => {
    await makeService().sendContactNotification(input);

    const text = String(emailState.send.mock.calls[0]?.[0]?.text);
    expect(text).toContain("Hello, how far back does the historical rate data go?");
    expect(text).toContain("August 2, 2026");
  });

  it("escapes user content in the HTML body", async () => {
    await makeService().sendContactNotification({
      ...input,
      message: "Hello <b>bold</b> & <script>alert(1)</script>",
    });

    const html = String(emailState.send.mock.calls[0]?.[0]?.html);
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt;");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("returns delivered:false without sending when the API key is missing", async () => {
    const result = await makeService({ apiKey: "" }).sendContactNotification(input);

    expect(result).toEqual({ delivered: false, messageId: input.messageId });
    expect(emailState.Resend).not.toHaveBeenCalled();
    expect(emailState.send).not.toHaveBeenCalled();
  });

  it("returns delivered:false without sending when the from address is missing", async () => {
    const result = await makeService({ fromEmail: "" }).sendContactNotification(input);

    expect(result).toEqual({ delivered: false, messageId: input.messageId });
    expect(emailState.send).not.toHaveBeenCalled();
  });

  it("returns delivered:false when Resend rejects the send (error payload)", async () => {
    emailState.send.mockResolvedValue({
      data: null,
      error: { name: "application_error", message: "Invalid sender" },
    });

    const result = await makeService().sendContactNotification(input);
    expect(result).toEqual({ delivered: false, messageId: input.messageId });
  });

  it("returns delivered:false when the send throws and never rethrows", async () => {
    emailState.send.mockRejectedValue(new Error("network down"));

    const result = await makeService().sendContactNotification(input);
    expect(result).toEqual({ delivered: false, messageId: input.messageId });
  });

  it("returns delivered:false when the provider exceeds the configured timeout", async () => {
    emailState.send.mockReturnValue(new Promise(() => {}));

    const result = await makeService({ timeoutMs: 20 }).sendContactNotification(input);
    expect(result).toEqual({ delivered: false, messageId: input.messageId });
  }, 5000);
});
