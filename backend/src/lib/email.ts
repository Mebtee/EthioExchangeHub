import { Resend } from "resend";

import { logger } from "@/lib/logger";
import type { ContactMessageInput } from "@/services/ContactService";
import { env } from "@/utils/validate-env";

/**
 * Best-effort email delivery for contact-form submissions.
 *
 * A successful contact submission is persisted to `contact_messages` FIRST —
 * that row is the source of truth. Forwarding it to the support inbox
 * (ethioexchanges@gmail.com by default) is a non-critical side effect: when
 * Resend is not configured or a send fails, this module logs the outcome and
 * returns `false`, and the API still answers 201. It never throws, so a
 * broken/missing email provider can never fail the request.
 *
 * Configuration (all optional):
 *   RESEND_API_KEY           — enables sending when set (empty = skip).
 *   RESEND_FROM_EMAIL        — verified sender (domain verified in Resend);
 *                              required only when RESEND_API_KEY is set.
 *   CONTACT_RECIPIENT_EMAIL  — inbox that receives submissions.
 */

let resendClient: Resend | null = null;

/**
 * A notifier that best-effort delivers a contact message. Contract: never
 * throws; returns `true` when delivered, `false` when skipped/failed.
 */
export type ContactMessageNotifier = (input: ContactMessageInput) => Promise<boolean>;

/** Lazily creates the Resend client the first time sending is enabled. */
function getResend(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

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

interface ContactEmail {
  subject: string;
  text: string;
  html: string;
}

/** Renders the plain-text + HTML bodies for a contact message notification. */
function buildEmail(input: ContactMessageInput): ContactEmail {
  const subject = `New contact message: ${input.subject}`;
  const text = [
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Subject: ${input.subject}`,
    "",
    input.message,
    "",
    "— Sent from the Ethio Exchange Hub contact form.",
  ].join("\n");

  const html = [
    '<table style="width:100%;max-width:640px;margin:0 auto;font-family:Arial,sans-serif;font-size:14px;color:#111827;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">',
    '<tr><td style="padding:16px 24px;background:#f9fafb;border-bottom:1px solid #e5e7eb"><strong>New contact message</strong></td></tr>',
    '<tr><td style="padding:24px">',
    `<p><strong>Name:</strong> ${escapeHtml(input.name)}</p>`,
    `<p><strong>Email:</strong> ${escapeHtml(input.email)}</p>`,
    `<p><strong>Subject:</strong> ${escapeHtml(input.subject)}</p>`,
    `<p style="white-space:pre-wrap">${escapeHtml(input.message)}</p>`,
    `<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />`,
    '<p style="color:#6b7280;font-size:12px;margin:0">Sent from the Ethio Exchange Hub contact form.</p>',
    "</td></tr>",
    "</table>",
  ].join("");

  return { subject, text, html };
}

/**
 * Forwards a contact message to the support inbox via Resend.
 *
 * Returns `true` when the email was accepted, `false` otherwise (not
 * configured, rejected by the provider, or a network error). Never throws.
 */
export async function sendContactMessageNotification(input: ContactMessageInput): Promise<boolean> {
  const client = getResend();
  if (!client) {
    logger.warn("EMAIL_SKIPPED", { reason: "RESEND_API_KEY not configured" });
    return false;
  }
  if (!env.RESEND_FROM_EMAIL) {
    logger.error("EMAIL_SKIPPED", { reason: "RESEND_FROM_EMAIL not configured" });
    return false;
  }

  const { subject, text, html } = buildEmail(input);
  try {
    const { data, error } = await client.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: env.CONTACT_RECIPIENT_EMAIL,
      replyTo: input.email,
      subject,
      text,
      html,
    });
    if (error) {
      logger.error("EMAIL_SEND_FAILED", {
        code: error.name,
        message: error.message,
        to: env.CONTACT_RECIPIENT_EMAIL,
      });
      return false;
    }
    logger.info("EMAIL_SENT", {
      id: data?.id,
      to: env.CONTACT_RECIPIENT_EMAIL,
      replyTo: input.email,
      subject,
    });
    return true;
  } catch (err) {
    logger.error("EMAIL_SEND_ERROR", {
      message: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
