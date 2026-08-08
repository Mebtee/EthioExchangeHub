import { ContactRepository } from "@/repositories/ContactRepository";
import type { ContactMessageRow } from "@/types/database";
import { logger } from "@/lib/logger";
import { nowIso } from "@/utils/date";
import type { EmailService } from "@/services/EmailService";

/** Input for submitting a contact message (domain shape — no API DTO yet). */
export interface ContactMessageInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

/** Public contract of the contact service. */
export interface ContactService {
  submitMessage(input: ContactMessageInput): Promise<ContactMessageRow>;
}

/**
 * Contact-message business logic: normalization (trimming) and timestamp
 * management live here. The repository only persists rows.
 *
 * RELIABILITY POLICY (documented and tested):
 *   - Persisting the submission to Supabase is the source of truth and happens
 *     FIRST — a notification failure can never lose the visitor's message.
 *   - The API then attempts to forward the message to the support inbox via the
 *     injected {@link EmailService}. A skipped/failed email is logged
 *     server-side (with the persisted message id) and never fails the request,
 *     so the visitor always gets a 201 for a successfully stored message and we
 *     never pretend an email was sent.
 *   - The email provider never throws; the try/catch below is a defensive guard
 *     for any future provider that violates that contract.
 */
export class ContactServiceImpl implements ContactService {
  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly emailService: EmailService,
  ) {}

  /** Normalizes and persists a contact message, then notifies best-effort. */
  async submitMessage(input: ContactMessageInput): Promise<ContactMessageRow> {
    const name = input.name.trim();
    const email = input.email.trim();
    const subject = input.subject.trim();
    const message = input.message.trim();

    const created = await this.contactRepository.createMessage({
      name,
      email,
      subject,
      message,
      created_at: nowIso(),
    });

    try {
      await this.emailService.sendContactNotification({
        messageId: created.id,
        name,
        email,
        subject,
        message,
        createdAt: created.created_at ?? nowIso(),
      });
    } catch (err) {
      // Defensive: the provider contract is never-throw. Log any violation with
      // the persisted message id and still return the stored row.
      logger.error("EMAIL_NOTIFICATION_UNHANDLED", {
        messageId: created.id,
        message: err instanceof Error ? err.message : String(err),
      });
    }

    return created;
  }
}
