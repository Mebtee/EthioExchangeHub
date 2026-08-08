import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendContactMessageNotification } from "@/lib/email";
import { env } from "@/utils/validate-env";

const emailState = vi.hoisted(() => {
  const send = vi.fn();
  const Resend = vi.fn(function ResendMock() {
    return { emails: { send } };
  });
  return { send, Resend };
});

vi.mock("resend", () => ({ Resend: emailState.Resend }));

const originalEnv = {
  apiKey: env.RESEND_API_KEY,
  from: env.RESEND_FROM_EMAIL,
  recipient: env.CONTACT_RECIPIENT_EMAIL,
};

const input = {
  name: "Abebe Kebede",
  email: "abebe@example.com",
  subject: "Question about rates",
  message: "Hello, how far back does the historical rate data go?",
};

function enableSending() {
  env.RESEND_API_KEY = "re_test_key";
  env.RESEND_FROM_EMAIL = "no-reply@ethioexchange.dev";
  env.CONTACT_RECIPIENT_EMAIL = "ethioexchanges@gmail.com";
}

describe("sendContactMessageNotification", () => {
  beforeEach(() => {
    enableSending();
    emailState.send.mockReset();
    emailState.send.mockResolvedValue({ data: { id: "email-1" }, error: null });
    emailState.Resend.mockClear();
  });

  afterEach(() => {
    env.RESEND_API_KEY = originalEnv.apiKey;
    env.RESEND_FROM_EMAIL = originalEnv.from;
    env.CONTACT_RECIPIENT_EMAIL = originalEnv.recipient;
    vi.restoreAllMocks();
  });

  it("skips sending when RESEND_API_KEY is not configured", async () => {
    env.RESEND_API_KEY = "";

    await expect(sendContactMessageNotification(input)).resolves.toBe(false);
    expect(emailState.send).not.toHaveBeenCalled();
  });

  it("sends the message via Resend with the recipient and reply-to set", async () => {
    await expect(sendContactMessageNotification(input)).resolves.toBe(true);

    expect(emailState.Resend).toHaveBeenCalledTimes(1);
    expect(emailState.Resend).toHaveBeenCalledWith("re_test_key");
    expect(emailState.send).toHaveBeenCalledTimes(1);
    expect(emailState.send).toHaveBeenCalledWith({
      from: "no-reply@ethioexchange.dev",
      to: "ethioexchanges@gmail.com",
      replyTo: "abebe@example.com",
      subject: "New contact message: Question about rates",
      text: expect.stringContaining("Name: Abebe Kebede"),
      html: expect.stringContaining("Abebe Kebede"),
    });
  });

  it("escapes user content in the HTML body", async () => {
    await sendContactMessageNotification({
      ...input,
      message: "Hello <b>bold</b> & <script>alert(1)</script>",
    });

    const html = String(emailState.send.mock.calls[0]?.[0]?.html);
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt;");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("returns false when Resend rejects the send", async () => {
    emailState.send.mockResolvedValue({
      data: null,
      error: { name: "application_error", message: "Invalid sender" },
    });

    await expect(sendContactMessageNotification(input)).resolves.toBe(false);
  });

  it("returns false when the send throws and never rethrows", async () => {
    emailState.send.mockRejectedValue(new Error("network down"));

    await expect(sendContactMessageNotification(input)).resolves.toBe(false);
  });
});
