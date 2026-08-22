import type { OpenAPIV3_1 } from "openapi-types";

/**
 * Phase 4 commercial-API documentation schemas: customer usage views.
 * (Commercial response payloads reuse the existing `ExchangeRate`, `Bank`,
 * and envelope schemas — one data model across free and paid surfaces.)
 */

/** Per-key usage line shown in `GET /customer/usage`. */
export const usageKeySchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "One API key's consumption in the current billing period.",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string", description: "Customer-chosen key label." },
    key_prefix: {
      type: "string",
      description: 'Public identifier, e.g. "eeh_live_x1Y2z3A4". Never the secret or its hash.',
    },
    requests_used: { type: "integer", description: "Successful requests this billing period." },
    last_used_at: { type: ["string", "null"], format: "date-time" },
    revoked_at: { type: ["string", "null"], format: "date-time" },
  },
  required: ["id", "name", "key_prefix", "requests_used", "last_used_at", "revoked_at"],
};

/** `GET /customer/usage` payload. */
export const customerUsageSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description:
    "Plan limits and current-period consumption for the authenticated customer. When no active subscription exists, limits are null and usage is zeroed.",
  properties: {
    subscription: {
      type: ["object", "null"],
      description: "The active subscription backing these limits (null when none).",
      properties: {
        subscription_id: { type: "string", format: "uuid" },
        status: { type: "string" },
        plan_name: { type: "string" },
        plan_slug: { type: "string" },
        monthly_request_limit: { type: "integer" },
        requests_per_minute: { type: "integer" },
        current_period_start: { type: "string", format: "date-time" },
        current_period_end: { type: "string", format: "date-time" },
      },
      required: [
        "subscription_id",
        "status",
        "plan_name",
        "plan_slug",
        "monthly_request_limit",
        "requests_per_minute",
        "current_period_start",
        "current_period_end",
      ],
    },
    monthly_limit: {
      type: ["integer", "null"],
      description: "Requests included per billing period (null without an active plan).",
    },
    requests_used: { type: "integer" },
    requests_remaining: {
      type: ["integer", "null"],
      description: "monthly_limit minus used, floored at 0 (null without an active plan).",
    },
    keys: { type: "array", items: usageKeySchema },
  },
  required: ["subscription", "monthly_limit", "requests_used", "requests_remaining", "keys"],
};

/** `GET /customer/usage/:apiKeyId` payload. */
export const keyUsageSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "Consumption for ONE owned API key in the current billing period.",
  properties: {
    key: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string" },
        key_prefix: { type: "string" },
        last_used_at: { type: ["string", "null"], format: "date-time" },
        revoked_at: { type: ["string", "null"], format: "date-time" },
        created_at: { type: "string", format: "date-time" },
        requests_used: { type: "integer" },
      },
      required: [
        "id",
        "name",
        "key_prefix",
        "last_used_at",
        "revoked_at",
        "created_at",
        "requests_used",
      ],
    },
    monthly_limit: { type: ["integer", "null"] },
    requests_used: { type: "integer" },
    requests_remaining: { type: ["integer", "null"] },
    current_period_start: { type: ["string", "null"], format: "date-time" },
  },
  required: ["key", "monthly_limit", "requests_used", "requests_remaining", "current_period_start"],
};
