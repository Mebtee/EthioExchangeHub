export interface ContactFormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export type ContactFormErrors = Partial<Record<keyof ContactFormState, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mirrors the backend zod schema (trimmed length bounds + email format). */
export function validateContactForm(form: ContactFormState): ContactFormErrors {
  const errors: ContactFormErrors = {};
  if (form.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }
  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_RE.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!form.subject.trim()) {
    errors.subject = "Subject is required.";
  }
  if (form.message.trim().length < 10) {
    errors.message = "Message must be at least 10 characters.";
  }
  return errors;
}
