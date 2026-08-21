import { arrayRef, pathParam, schemaRef, successResponse, type DocPathItem } from "../helpers";

/**
 * Customer API-key endpoints (Phase 2B). Mounted under `/api/v1/customer`,
 * behind `requireAuth` + `requireRole("customer")`.
 */
export const customerApiKeysPaths: Record<string, DocPathItem> = {
  "/customer/api-keys": {
    post: {
      tags: ["Customer API Keys"],
      summary: "Create an API key",
      description:
        "Creates an API key for the authenticated customer. The response carries the complete secret (`key`, `eeh_live_...`) EXACTLY ONCE — only the SHA-256 hash and the public prefix are stored, so the secret can never be retrieved again. Requires a customer bearer token; each customer only ever sees and owns their own keys.",
      operationId: "createCustomerApiKey",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: schemaRef("CreateCustomerApiKeyInput") },
        },
      },
      responses: {
        "201": successResponse("API key created successfully.", schemaRef("CustomerApiKeyCreated")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
        "404": { $ref: "#/components/responses/NotFound" },
        "409": { $ref: "#/components/responses/Conflict" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
    get: {
      tags: ["Customer API Keys"],
      summary: "List API keys",
      description:
        "Lists the authenticated customer's API keys, newest first. Returns public prefixes and status fields only — never the full secret or its stored hash. Revoked and expired keys remain listed with their status timestamps.",
      operationId: "listCustomerApiKeys",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": successResponse("API keys retrieved.", arrayRef("CustomerApiKey")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/customer/api-keys/{id}": {
    delete: {
      tags: ["Customer API Keys"],
      summary: "Revoke an API key",
      description:
        "Secure revocation: stamps `revokedAt` on the key without deleting the row. Idempotent — revoking an already-revoked key returns it unchanged. Only keys owned by the authenticated customer can be revoked; any other id answers 404.",
      operationId: "revokeCustomerApiKey",
      security: [{ bearerAuth: [] }],
      parameters: [pathParam("id", "API key id.", "uuid")],
      responses: {
        "200": successResponse("API key revoked.", schemaRef("CustomerApiKey")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
        "404": { $ref: "#/components/responses/NotFound" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
};
