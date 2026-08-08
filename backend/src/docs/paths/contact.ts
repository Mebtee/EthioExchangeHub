import { schemaRef, successResponse, type DocPathItem } from "../helpers";

/** Contact endpoints (mounted under `/api/v1`). */
export const contactPaths: Record<string, DocPathItem> = {
  "/contact/messages": {
    post: {
      tags: ["Contact"],
      summary: "Submit a contact message",
      description:
        "Persists a visitor message from the public Contact page. Messages are validated, trimmed, and stored in Supabase for later review, then forwarded to the support inbox via Resend as a notification email (Reply-To is the visitor's address). Email delivery is best-effort and never required for the response: when the email provider is not configured or a send fails, the message is still stored and the API still answers 201. The response confirms the message was received and stored.",
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
