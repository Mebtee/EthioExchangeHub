import type { OpenAPIV3_1 } from "openapi-types";

import { apiExamples } from "../examples";

/** `manual_rates` row. */
export const manualRateSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "A human-entered manual rate override.",
  example: apiExamples.manualRate,
  properties: {
    id: { type: "string", format: "uuid", description: "Row id." },
    bank_code: { type: "string", description: "Bank natural key." },
    currency_code: { type: "string", description: "3-letter currency code." },
    buying_rate: { type: ["number", "null"], description: "Cash buying rate." },
    selling_rate: { type: ["number", "null"], description: "Cash selling rate." },
    transactional_buying: { type: ["number", "null"], description: "Transactional buying rate." },
    transactional_selling: { type: ["number", "null"], description: "Transactional selling rate." },
    rate_date: { type: "string", format: "date", description: "ISO date (YYYY-MM-DD)." },
    entered_by: { type: ["string", "null"], description: "Auth user id that entered the rate." },
    note: { type: ["string", "null"], description: "Optional note." },
    created_at: {
      type: ["string", "null"],
      format: "date-time",
      description: "Creation timestamp.",
    },
  },
  required: ["id", "bank_code", "currency_code", "rate_date"],
};

/** Request body for `POST /manual-rates`. */
export const manualRateInputSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "Payload for creating a manual rate.",
  example: apiExamples.manualRateInput,
  properties: {
    bank_code: { type: "string", description: "Bank natural key." },
    currency_code: {
      type: "string",
      pattern: "^[A-Z]{3}$",
      description: "3-letter currency code.",
    },
    buying_rate: {
      type: "number",
      exclusiveMinimum: 0,
      description: "Cash buying rate (positive).",
    },
    selling_rate: {
      type: "number",
      exclusiveMinimum: 0,
      description: "Cash selling rate (positive).",
    },
    transactional_buying: {
      type: ["number", "null"],
      exclusiveMinimum: 0,
      description: "Transactional buying rate (positive, optional).",
    },
    transactional_selling: {
      type: ["number", "null"],
      exclusiveMinimum: 0,
      description: "Transactional selling rate (positive, optional).",
    },
    rate_date: { type: "string", format: "date", description: "ISO date (YYYY-MM-DD)." },
    note: { type: ["string", "null"], maxLength: 500, description: "Optional note." },
    entered_by: { type: ["string", "null"], maxLength: 64, description: "Optional auth user id." },
  },
  required: ["bank_code", "currency_code", "buying_rate", "selling_rate", "rate_date"],
};

/** Request body for `PUT /manual-rates/{id}` — any subset, at least one field. */
export const manualRateUpdateInputSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "Payload for updating a manual rate. At least one field must be provided.",
  properties: manualRateInputSchema.properties,
};
