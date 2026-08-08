import { schemaRef, successResponse, type DocPathItem } from "../helpers";

/** Contact endpoints (mounted under `/api/v1`). */
export const contactPaths: Record<string, DocPathItem> = {
  "/contact/messages": {
    post: {
      tags: ["Contact"],
      summary: "Submit a contact message",
      description:
        "Persists a visitor message from the public Contact page. Messages are validated, trimmed, and stored for later review. The API does not send an email — no email provider is configured yet, so the response confirms the message was received and stored.",
      operationId: "submitContactMessage",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: schemaRef("ContactMessageInput"),
          },
        },
      },
      responses: {
        "201": successResponse("Message received.", schemaRef("ContactMessage")),
        "422": { $ref: "#/components/responses/ValidationError" },
        "500": { $ref: "#/components/responses/DatabaseError" },
      },
    },
  },
};
