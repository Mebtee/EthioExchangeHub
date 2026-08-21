import type { OpenAPIV3_1 } from "openapi-types";

/**
 * OpenAPI schemas for the customer API-key surface (Phase 2B).
 *
 * `CustomerApiKey` is the LIST/GET view: it contains the public `keyPrefix`
 * and status timestamps but NEVER `key_hash` or the full secret.
 * `CustomerApiKeyCreated` adds `key` — the one-time secret that exists only
 * in the creation response and can never be retrieved again.
 */

/** API-key view returned by list and revoke (no secrets). */
export const customerApiKeySchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description:
    "A customer API key. Only the public prefix is exposed; the full secret exists solely in the creation response.",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string", description: "Human-readable label for this key." },
    keyPrefix: {
      type: "string",
      description: 'Public identifier, e.g. "eeh_live_x1Y2z3A4". Not the secret.',
    },
    lastUsedAt: {
      type: ["string", "null"],
      format: "date-time",
      description: "Timestamp of the last authenticated use (commercial API phase).",
    },
    expiresAt: {
      type: ["string", "null"],
      format: "date-time",
      description: "Expiration timestamp, or null when the key never expires.",
    },
    revokedAt: {
      type: ["string", "null"],
      format: "date-time",
      description: "Revocation timestamp, or null while the key is still active.",
    },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
  required: [
    "id",
    "name",
    "keyPrefix",
    "lastUsedAt",
    "expiresAt",
    "revokedAt",
    "createdAt",
    "updatedAt",
  ],
};

/** Creation response payload: view + the one-time secret. */
export const customerApiKeyCreatedSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description:
    "A newly created API key. `key` is the complete secret (`eeh_live_...`) shown EXACTLY ONCE — store it immediately; it cannot be retrieved later. Revoked keys are not recoverable either: create a new key instead.",
  allOf: [
    { $ref: "#/components/schemas/CustomerApiKey" },
    {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: 'The full secret, e.g. "eeh_live_9fj2…". Returned once, never stored.',
        },
      },
      required: ["key"],
    },
  ],
};

/** Request body for `POST /customer/api-keys`. */
export const createCustomerApiKeyInputSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  properties: {
    name: {
      type: "string",
      minLength: 1,
      maxLength: 100,
      description: "Human-readable label (trimmed, at most 100 characters).",
    },
    expires_at: {
      type: "string",
      format: "date-time",
      description: "Optional ISO-8601 expiration; must be in the future when supplied.",
    },
  },
  required: ["name"],
};
