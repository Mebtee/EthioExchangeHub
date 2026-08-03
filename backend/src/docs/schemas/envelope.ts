import type { OpenAPIV3_1 } from "openapi-types";

/**
 * The standard error envelope produced by `errorResponse`:
 * `{ success: false, message, data: null }`.
 */
export const errorEnvelopeSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "Standard error envelope.",
  properties: {
    success: { type: "boolean", enum: [false] },
    message: { type: "string", description: "Human-readable error message." },
    data: { type: "null" },
  },
  required: ["success", "message", "data"],
};
