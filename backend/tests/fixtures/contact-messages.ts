import type { ContactMessageRow } from "@/types/database";

/** Typed contact-message fixtures. */
export const contactMessages: ContactMessageRow[] = [
  {
    id: "contact-1",
    name: "Abebe Kebede",
    email: "abebe@example.com",
    subject: "Question about historical rates",
    message: "Hello, could you share how far back the historical rate data goes?",
    created_at: "2026-08-02T09:05:00.000Z",
  },
];
