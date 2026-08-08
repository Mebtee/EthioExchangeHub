import { ContactRepository } from "@/repositories/ContactRepository";
import type { ContactMessageRow } from "@/types/database";
import { nowIso } from "@/utils/date";
import { sendContactMessageNotification, type ContactMessageNotifier } from "@/lib/email";

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
 * EMAIL DELIVERY: persisting the submission is the source of truth; the API
 * then best-effort forwards it to the support inbox (ethioexchanges@gmail.com)
 * via Resend when configured (see `lib/email.ts`). The notification is a
 * fire-and-forget side effect — a missing provider or a failed send is logged
 * and never fails the request, so the API never pretends an email was sent.
 */
export class ContactServiceImpl implements ContactService {
  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly notify: ContactMessageNotifier = sendContactMessageNotification,
  ) {}

  /** Normalizes and persists a contact message, then best-effort notifies. */
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

    // Best-effort email notification — never awaited, never throws.
    void this.notify({ name, email, subject, message });
    return created;
  }
}
