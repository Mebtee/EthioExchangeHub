import { Resend } from "resend";

import { logger } from "@/lib/logger";

/**
 * Email delivery for the public Contact page.
 *
 * The contact message is persisted to `contact_messages` FIRST — that row is
 * the source of truth (see `ContactService`). This service is the dedicated
 * provider abstraction for the *notification* side effect: it forwards the
 * stored message to the configured support inbox via Resend.
 *
 * Reliability policy (documented and tested):
 *   - Database persistence happens BEFORE any email attempt.
 *   - If email delivery fails, the persisted row is preserved and the failure
 *     is observable server-side through structured logs — the API never
 *     pretends the email was sent and never exposes provider details.
 *   - `sendContactNotification` NEVER throws: a broken/missing email provider
 *     can never fail the request that already stored the message.
 *
 * Configuration is injected via the constructor (see `routes/index.ts`), so
 * the provider is fully testable without a real Resend account. The visitor's
 * email is used only as Reply-To — it is NEVER used as the From address, which
 * must be a sender/domain verified in the Resend dashboard.
 */

/** Everything the notification email needs to render. */
export interface ContactNotificationInput {
  /** Persisted contact-message row id — used as the idempotency key. */
  messageId: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  /** ISO timestamp stamped by the contact service (persisted created_at). */
  createdAt: string;
}

/** Outcome of a notification attempt. Delivered=false means skipped/failed. */
export interface ContactNotificationResult {
  delivered: boolean;
  messageId: string;
}

/** Public contract of the email provider. */
export interface EmailService {
  sendContactNotification(input: ContactNotificationInput): Promise<ContactNotificationResult>;
}

interface ResendEmailServiceOptions {
  /** Empty/undefined disables sending (messages are still persisted). */
  apiKey?: string;
  /** Empty/undefined disables sending; must be a Resend-verified sender. */
  fromEmail?: string;
  toEmail: string;
  /** Bounds the provider request so a slow provider cannot stall the API. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

/** Escapes user-supplied text for safe inclusion in the HTML email body. */
function escapeHtml(value: string): string {
  const replacements: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (char) => replacements[char] as string);
}

/** Renders the submission timestamp for the email body (local display time). */
function formatSubmittedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ContactEmail {
  subject: string;
  text: string;
  html: string;
}

/** Renders the plain-text + HTML bodies for a contact-message notification. */
function buildEmail(input: ContactNotificationInput): ContactEmail {
  const subject = `[Ethio ExchangeHub Contact] ${input.subject}`;
  const submittedAt = formatSubmittedAt(input.createdAt);

  const text = [
    "Ethio ExchangeHub",
    "New Contact Us Message",
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Subject: ${input.subject}`,
    "",
    input.message,
    "",
    `Submitted: ${submittedAt}`,
    "— Sent from the Ethio ExchangeHub Contact Us form.",
  ].join("\n");

  const html = [
    '<table style="width:100%;max-width:640px;margin:0 auto;font-family:Arial,sans-serif;font-size:14px;color:#111827;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">',
    '<tr><td style="padding:16px 24px;background:#0b1220;color:#ffffff;border-bottom:1px solid #e5e7eb">',
    "<strong>Ethio ExchangeHub</strong><br/>",
    '<span style="font-size:12px;color:#9ca3af">New Contact Us Message</span>',
    "</td></tr>",
    '<tr><td style="padding:24px">',
    `<p style="margin:0 0 12px"><strong>Name:</strong> ${escapeHtml(input.name)}</p>`,
    `<p style="margin:0 0 12px"><strong>Email:</strong> ${escapeHtml(input.email)}</p>`,
    `<p style="margin:0 0 12px"><strong>Subject:</strong> ${escapeHtml(input.subject)}</p>`,
    `<p style="white-space:pre-wrap;margin:0 0 16px">${escapeHtml(input.message)}</p>`,
    `<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />`,
    `<p style="color:#6b7280;font-size:12px;margin:0 0 4px">Submitted: ${escapeHtml(submittedAt)}</p>`,
    '<p style="color:#6b7280;font-size:12px;margin:0">Sent from the Ethio ExchangeHub Contact Us form.</p>',
    "</td></tr>",
    "</table>",
  ].join("");

  return { subject, text, html };
}

/**
 * Resend-backed {@link EmailService}.
 *
 * The Resend client is created lazily on first send and reused for the process
 * lifetime. Every send carries an `Idempotency-Key` derived from the persisted
 * message id, so retrying the same backend operation cannot create duplicate
 * emails. Requests are bounded by a timeout; a timed-out/failed send returns
 * `{ delivered: false }` and is logged with the message id only.
 */
export class ResendEmailService implements EmailService {
  private readonly apiKey?: string;
  private readonly fromEmail?: string;
  private readonly toEmail: string;
  private readonly timeoutMs: number;
  private client: Resend | null = null;

  constructor(options: ResendEmailServiceOptions) {
    this.apiKey = options.apiKey;
    this.fromEmail = options.fromEmail;
    this.toEmail = options.toEmail;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private getClient(): Resend | null {
    if (!this.apiKey) return null;
    if (!this.client) {
      this.client = new Resend(this.apiKey);
    }
    return this.client;
  }

  /**
   * Forwards a contact message to the support inbox. Never throws; returns
   * `{ delivered: true }` only when Resend accepts the message.
   */
  async sendContactNotification(
    input: ContactNotificationInput,
  ): Promise<ContactNotificationResult> {
    const client = this.getClient();
    if (!client) {
      logger.warn("EMAIL_SKIPPED", {
        messageId: input.messageId,
        reason: "RESEND_API_KEY not configured",
      });
      return { delivered: false, messageId: input.messageId };
    }
    if (!this.fromEmail) {
      logger.error("EMAIL_SKIPPED", {
        messageId: input.messageId,
        reason: "CONTACT_EMAIL_FROM not configured",
      });
      return { delivered: false, messageId: input.messageId };
    }

    const { subject, text, html } = buildEmail(input);
    // Stable idempotency key: retrying the same persisted message is a no-op.
    const idempotencyKey = `contact-${input.messageId}`;

    try {
      const result = await this.sendWithTimeout(
        client,
        { from: this.fromEmail, to: this.toEmail, replyTo: input.email, subject, text, html },
        idempotencyKey,
      );
      if (result.error) {
        logger.error("EMAIL_SEND_FAILED", {
          messageId: input.messageId,
          code: result.error.name,
          message: result.error.message,
        });
        return { delivered: false, messageId: input.messageId };
      }
      logger.info("EMAIL_SENT", {
        messageId: input.messageId,
        id: result.data?.id,
        from: this.fromEmail,
        to: this.toEmail,
        replyTo: input.email,
        subject,
      });
      return { delivered: true, messageId: input.messageId };
    } catch (err) {
      logger.error("EMAIL_SEND_ERROR", {
        messageId: input.messageId,
        message: err instanceof Error ? err.message : String(err),
      });
      return { delivered: false, messageId: input.messageId };
    }
  }

  /**
   * Calls Resend's emails.send with the idempotency key and bounds the request
   * with a timeout so a hanging provider cannot stall the API response.
   */
  private async sendWithTimeout(
    client: Resend,
    payload: {
      from: string;
      to: string;
      replyTo: string;
      subject: string;
      text: string;
      html: string;
    },
    idempotencyKey: string,
  ): Promise<Awaited<ReturnType<Resend["emails"]["send"]>>> {
    const request = client.emails.send(payload, { idempotencyKey });
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Email send timed out after ${this.timeoutMs}ms`)),
        this.timeoutMs,
      ).unref();
    });
    return Promise.race([request, timeout]);
  }
}
