import type { OpenAPIV3_1 } from "openapi-types";

import { apiExamples } from "../examples";

/** `banks` row. */
export const bankSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "A bank in the exchange directory.",
  example: apiExamples.bank,
  properties: {
    bank_code: { type: "string", description: 'Natural key (e.g. "ABY").' },
    bank_name: { type: "string", description: "Display name." },
    bank_type: {
      type: "string",
      enum: ["private", "state_owned"],
      description: "Ownership type.",
    },
    source_url: { type: ["string", "null"], format: "uri", description: "Official source URL." },
    is_active: { type: ["boolean", "null"], description: "Whether the bank is currently listed." },
    created_at: {
      type: ["string", "null"],
      format: "date-time",
      description: "Creation timestamp.",
    },
  },
  required: ["bank_code", "bank_name", "bank_type"],
};
