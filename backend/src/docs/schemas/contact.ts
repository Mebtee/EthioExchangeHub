import type { OpenAPIV3_1 } from "openapi-types";

import { apiExamples } from "../examples";

/** `contact_messages` row. */
export const contactMessageSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "A persisted contact-message submission from the public Contact page.",
  example: apiExamples.contactMessage,
  properties: {
    id: { type: "string", format: "uuid", description: "Row id." },
    name: { type: "string", description: "Sender's name." },
    email: { type: "string", format: "email", description: "Sender's email address." },
    subject: { type: "string", description: "Message subject." },
    message: { type: "string", description: "Message body." },
    created_at: {
      type: ["string", "null"],
      format: "date-time",
      description: "Creation timestamp.",
    },
  },
  required: ["id", "name", "email", "subject", "message"],
};

/** Request body for `POST /contact/messages`. */
export const contactMessageInputSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "Payload for submitting a contact message.",
  example: apiExamples.contactMessageInput,
  properties: {
    name: { type: "string", minLength: 2, maxLength: 120, description: "Sender's name." },
    email: { type: "string", format: "email", maxLength: 254, description: "Sender's email." },
    subject: { type: "string", minLength: 1, maxLength: 200, description: "Message subject." },
    message: {
      type: "string",
      minLength: 10,
      maxLength: 5000,
      description: "Message body.",
    },
  },
  required: ["name", "email", "subject", "message"],
};
