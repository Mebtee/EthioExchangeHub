import type { OpenAPIV3_1 } from "openapi-types";

import { errorEnvelopeSchema } from "../schemas/envelope";

/** Builds a reusable error response with a representative example message. */
function errorResponse(description: string, exampleMessage: string): OpenAPIV3_1.ResponseObject {
  return {
    description,
    content: {
      "application/json": {
        schema: errorEnvelopeSchema,
        example: { success: false, message: exampleMessage, data: null },
      },
    },
  };
}

/**
 * Reusable common error responses (exposed as `components.responses`).
 *
 * Only the codes the API actually produces are referenced by endpoints, but
 * the full set is defined here so future endpoints can reuse them unchanged.
 */
export const commonResponses = {
  BadRequest: errorResponse("The request was malformed.", "Bad request."),
  NotFound: errorResponse("The requested resource does not exist.", 'Bank "ZZZZ" not found.'),
  Conflict: errorResponse(
    "The request conflicts with the current state of the resource.",
    "A manual rate for ABY / USD on 2026-08-02 already exists.",
  ),
  ValidationError: errorResponse(
    "The request failed validation.",
    "Invalid query parameters: limit: must be a positive integer (>= 1)",
  ),
  DatabaseError: errorResponse("A database operation failed.", "Internal server error."),
  ServiceUnavailable: errorResponse(
    "The service is temporarily unavailable (e.g. database unreachable).",
    "Database connection failed.",
  ),
} satisfies Record<string, OpenAPIV3_1.ResponseObject>;
