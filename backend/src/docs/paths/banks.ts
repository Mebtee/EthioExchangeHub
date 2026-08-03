import {
  arrayRef,
  pathParam,
  queryParam,
  schemaRef,
  successResponse,
  type DocPathItem,
} from "../helpers";

/** Banks endpoints (mounted under `/api/v1`). */
export const banksPaths: Record<string, DocPathItem> = {
  "/banks": {
    get: {
      tags: ["Banks"],
      summary: "List banks",
      description:
        "Returns the full bank directory, optionally filtered by active status and type, sorted by name.",
      operationId: "listBanks",
      parameters: [
        queryParam("activeOnly", 'Only banks flagged active ("true"/"false").', {
          enum: ["true", "false"],
        }),
        queryParam("bankType", "Only banks of the given type.", {
          enum: ["private", "state_owned"],
        }),
      ],
      responses: {
        "200": successResponse("Banks retrieved.", arrayRef("Bank")),
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/banks/active": {
    get: {
      tags: ["Banks"],
      summary: "List active banks",
      description: "Returns only banks currently flagged active, sorted by name.",
      operationId: "listActiveBanks",
      responses: {
        "200": successResponse("Active banks retrieved.", arrayRef("Bank")),
      },
    },
  },
  "/banks/{bankCode}": {
    get: {
      tags: ["Banks"],
      summary: "Get a bank by code",
      description: "Returns a single bank identified by its natural key.",
      operationId: "getBankByCode",
      parameters: [pathParam("bankCode", "Bank code (e.g. ABY).")],
      responses: {
        "200": successResponse("Bank retrieved.", schemaRef("Bank")),
        "404": { $ref: "#/components/responses/NotFound" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
};
