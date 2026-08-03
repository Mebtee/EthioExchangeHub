/**
 * Small builders shared across the OpenAPI path definitions.
 *
 * These keep the spec DRY: every response wraps the standard envelope, arrays
 * and nullable values reuse the same shapes, and component references are
 * built from names so typos surface at compile time.
 */

import type { OpenAPIV3_1 } from "openapi-types";

/**
 * openapi-types v12 types `3.1` response objects as an intersection with the
 * 3.0 shapes, which rejects valid 3.1-only schemas (type arrays, `type: null`,
 * numeric `exclusiveMinimum`). These local types keep the rest of the
 * operation fully typed while relaxing only the `responses` position; the
 * final document casts `paths` once at the assembly boundary.
 */

/** Response map keyed by status code. */
export type DocResponses = Record<string, OpenAPIV3_1.ResponseObject | OpenAPIV3_1.ReferenceObject>;

/** Operation with a permissive (but typed) response map. */
export type DocOperation = Omit<OpenAPIV3_1.OperationObject, "responses"> & {
  responses: DocResponses;
};

/** Path item limited to the HTTP methods this API uses. */
export interface DocPathItem {
  get?: DocOperation;
  post?: DocOperation;
  put?: DocOperation;
  delete?: DocOperation;
}

/** Reference to a named component schema. */
export function schemaRef(name: string): OpenAPIV3_1.ReferenceObject {
  return { $ref: `#/components/schemas/${name}` };
}

/** Array of a named component schema. */
export function arrayRef(name: string): OpenAPIV3_1.SchemaObject {
  return { type: "array", items: schemaRef(name) };
}

/** A named component schema that may also be null. */
export function nullableRef(name: string): OpenAPIV3_1.SchemaObject {
  return { oneOf: [schemaRef(name), { type: "null" }] };
}

/** Wraps a data schema in the standard success envelope. */
export function successEnvelope(data: OpenAPIV3_1.SchemaObject): OpenAPIV3_1.SchemaObject {
  return {
    type: "object",
    properties: {
      success: { type: "boolean", enum: [true] },
      message: { type: "string" },
      data,
    },
    required: ["success", "message", "data"],
  };
}

/** A JSON response body describing `schema`. */
export function jsonResponse(
  description: string,
  schema: OpenAPIV3_1.SchemaObject,
): OpenAPIV3_1.ResponseObject {
  return {
    description,
    content: { "application/json": { schema } },
  };
}

/** A success response wrapping `dataSchema` in the standard envelope. */
export function successResponse(
  description: string,
  dataSchema: OpenAPIV3_1.SchemaObject,
): OpenAPIV3_1.ResponseObject {
  return jsonResponse(description, successEnvelope(dataSchema));
}

/** Required path parameter. */
export function pathParam(
  name: string,
  description: string,
  format?: string,
): OpenAPIV3_1.ParameterObject {
  return {
    name,
    in: "path",
    required: true,
    description,
    schema: {
      type: "string",
      ...(format ? { format } : {}),
    },
  };
}

/** Optional query parameter (string values; format/enum/pattern optional). */
export function queryParam(
  name: string,
  description: string,
  options: { enum?: string[]; format?: string; pattern?: string } = {},
): OpenAPIV3_1.ParameterObject {
  return {
    name,
    in: "query",
    required: false,
    description,
    schema: {
      type: "string",
      ...(options.enum ? { enum: options.enum } : {}),
      ...(options.format ? { format: options.format } : {}),
      ...(options.pattern ? { pattern: options.pattern } : {}),
    },
  };
}
