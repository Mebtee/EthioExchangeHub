import {
  arrayRef,
  pathParam,
  queryParam,
  schemaRef,
  successResponse,
  type DocPathItem,
} from "../helpers";

/** Manual-rate endpoints (mounted under `/api/v1`). */
export const manualRatesPaths: Record<string, DocPathItem> = {
  "/manual-rates": {
    get: {
      tags: ["Manual Rates"],
      summary: "List manual rates",
      description: "Lists human-entered rate overrides, newest first, with optional filters.",
      operationId: "listManualRates",
      security: [{ bearerAuth: [] }],
      parameters: [
        queryParam("bankCode", "Bank code (e.g. ABY)."),
        queryParam("currencyCode", "3-letter currency code (e.g. USD)."),
        queryParam("rateDate", "Exact ISO date (YYYY-MM-DD).", { format: "date" }),
      ],
      responses: {
        "200": successResponse("Manual rates retrieved.", arrayRef("ManualRate")),
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
    post: {
      tags: ["Manual Rates"],
      summary: "Create a manual rate",
      description:
        "Creates a manual rate override after validating the bank, currency, date, positive rates, and uniqueness.",
      operationId: "createManualRate",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: schemaRef("ManualRateInput"),
          },
        },
      },
      responses: {
        "201": successResponse("Manual rate created.", schemaRef("ManualRate")),
        "404": { $ref: "#/components/responses/NotFound" },
        "409": { $ref: "#/components/responses/Conflict" },
        "422": { $ref: "#/components/responses/ValidationError" },
        "500": { $ref: "#/components/responses/DatabaseError" },
      },
    },
  },
  "/manual-rates/{id}": {
    put: {
      tags: ["Manual Rates"],
      summary: "Update a manual rate",
      description: "Updates a manual rate by id. At least one field must be provided.",
      operationId: "updateManualRate",
      security: [{ bearerAuth: [] }],
      parameters: [pathParam("id", "Manual rate id.", "uuid")],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: schemaRef("ManualRateUpdateInput"),
          },
        },
      },
      responses: {
        "200": successResponse("Manual rate updated.", schemaRef("ManualRate")),
        "404": { $ref: "#/components/responses/NotFound" },
        "409": { $ref: "#/components/responses/Conflict" },
        "422": { $ref: "#/components/responses/ValidationError" },
        "500": { $ref: "#/components/responses/DatabaseError" },
      },
    },
    delete: {
      tags: ["Manual Rates"],
      summary: "Delete a manual rate",
      description: "Deletes a manual rate by id.",
      operationId: "deleteManualRate",
      security: [{ bearerAuth: [] }],
      parameters: [pathParam("id", "Manual rate id.", "uuid")],
      responses: {
        "200": successResponse("Manual rate deleted.", { type: "null" }),
        "404": { $ref: "#/components/responses/NotFound" },
        "422": { $ref: "#/components/responses/ValidationError" },
        "500": { $ref: "#/components/responses/DatabaseError" },
      },
    },
  },
};
