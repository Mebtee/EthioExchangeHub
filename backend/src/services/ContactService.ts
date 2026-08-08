import { ContactRepository } from "@/repositories/ContactRepository";
import type { ContactMessageRow } from "@/types/database";
import { nowIso } from "@/utils/date";

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
 * NOTE ON EMAIL DELIVERY: the API persists the submission. Forwarding it to
 * the support inbox (ethioexchanges@gmail.com) requires an email provider
 * (e.g. Resend/SendGrid/SMTP) configured via backend environment variables.
 * No provider is wired yet, so this service only stores the message — it never
 * pretends an email was sent.
 */
export class ContactServiceImpl implements ContactService {
  constructor(private readonly contactRepository: ContactRepository) {}

  /** Normalizes and persists a contact message. */
  async submitMessage(input: ContactMessageInput): Promise<ContactMessageRow> {
    return this.contactRepository.createMessage({
      name: input.name.trim(),
      email: input.email.trim(),
      subject: input.subject.trim(),
      message: input.message.trim(),
      created_at: nowIso(),
    });
  }
}
