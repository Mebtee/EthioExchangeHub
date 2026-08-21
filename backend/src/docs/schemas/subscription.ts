import type { OpenAPIV3_1 } from "openapi-types";

/**
 * OpenAPI schemas for the customer plan/subscription surface (Phase 2C).
 *
 * Views expose catalog and status information only — no internal
 * bookkeeping, no client-writable fields (the creation input is exactly one
 * field: `plan_id`).
 */

/** Active API plan as shown in the customer-facing catalog. */
export const customerPlanSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "An active commercial API plan.",
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    slug: { type: "string" },
    description: { type: ["string", "null"] },
    price: { type: "number", description: "Price per billing interval (0 = free plan)." },
    currency: { type: "string", description: 'ISO 4217 code, e.g. "ETB".' },
    billingInterval: { type: "string", description: 'Currently always "monthly".' },
    monthlyRequestLimit: {
      type: "integer",
      description: "Requests included per billing period (quota enforcement comes later).",
    },
    requestsPerMinute: {
      type: "integer",
      description: "Rate limit for the commercial API (enforcement comes later).",
    },
    maxApiKeys: { type: "integer", description: "Maximum simultaneously non-revoked API keys." },
    displayOrder: { type: "integer", description: "Catalog sort position." },
  },
  required: [
    "id",
    "name",
    "slug",
    "description",
    "price",
    "currency",
    "billingInterval",
    "monthlyRequestLimit",
    "requestsPerMinute",
    "maxApiKeys",
    "displayOrder",
  ],
};

/** The customer's current/latest subscription. */
export const customerSubscriptionSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description:
    "The authenticated customer's latest subscription. Paid selections stay `pending` until bank-transfer approval activates them; free plans activate immediately.",
  properties: {
    id: { type: "string", format: "uuid" },
    planId: { type: "string", format: "uuid" },
    status: {
      type: "string",
      enum: ["pending", "active", "expired", "cancelled", "suspended"],
      description:
        "`pending` = awaiting payment approval; only `active` grants plan limits/API keys.",
    },
    startsAt: { type: ["string", "null"], format: "date-time" },
    endsAt: { type: ["string", "null"], format: "date-time" },
    currentPeriodStart: { type: ["string", "null"], format: "date-time" },
    currentPeriodEnd: { type: ["string", "null"], format: "date-time" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
  required: [
    "id",
    "planId",
    "status",
    "startsAt",
    "endsAt",
    "currentPeriodStart",
    "currentPeriodEnd",
    "createdAt",
    "updatedAt",
  ],
};

/** Request body for `POST /customer/subscription` — plan selection ONLY. */
export const createCustomerSubscriptionInputSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description:
    "Plan selection. Every other attribute (customer, status, price, currency, periods) is backend-controlled; supplying them is rejected as an unknown field.",
  properties: {
    plan_id: { type: "string", format: "uuid", description: "Id of an ACTIVE plan." },
  },
  required: ["plan_id"],
};
