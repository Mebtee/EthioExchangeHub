import { queryParam, schemaRef, successResponse, type DocPathItem } from "../helpers";

/** Admin endpoints (mounted under `/api/v1`). */
export const adminPaths: Record<string, DocPathItem> = {
  "/admin/profile": {
    get: {
      tags: ["Admin"],
      summary: "Get admin profile",
      description: "Returns the authenticated administrator's profile from the `users` row.",
      operationId: "getAdminProfile",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": successResponse("Admin profile retrieved.", schemaRef("AdminProfile")),
      },
    },
    put: {
      tags: ["Admin"],
      summary: "Update admin profile",
      description: "Persists the provided profile fields and returns the stored profile.",
      operationId: "updateAdminProfile",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: { "application/json": { schema: schemaRef("AdminProfileInput") } },
      },
      responses: {
        "200": successResponse("Admin profile updated.", schemaRef("AdminProfile")),
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/admin/settings": {
    get: {
      tags: ["Admin"],
      summary: "Get admin settings",
      description: "Returns the persisted platform settings merged with the configured defaults.",
      operationId: "getAdminSettings",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": successResponse("Admin settings retrieved.", schemaRef("AdminSettings")),
      },
    },
    put: {
      tags: ["Admin"],
      summary: "Update admin settings",
      description: "Persists the provided settings fields and returns the stored settings.",
      operationId: "updateAdminSettings",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: { "application/json": { schema: schemaRef("AdminSettingsInput") } },
      },
      responses: {
        "200": successResponse("Admin settings updated.", schemaRef("AdminSettings")),
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/admin/dashboard/rate-trend": {
    get: {
      tags: ["Admin"],
      summary: "Get rate trend",
      description:
        "Cash buying/selling trend aggregated by rate date across the exchange_rates table, oldest first. Returns the newest `days` points (default 30). Optionally narrows to one currency so the dashboard's USD/ETB chart never mixes other currencies into the average.",
      operationId: "getRateTrend",
      security: [{ bearerAuth: [] }],
      parameters: [
        queryParam("days", "Number of most recent rate dates to return (default 30).", {
          pattern: "^[1-9]\\d*$",
        }),
        queryParam(
          "currency",
          "Restrict to one currency (e.g. USD); all currencies when omitted.",
          {
            pattern: "^[A-Z]{3}$",
          },
        ),
      ],
      responses: {
        "200": successResponse("Rate trend retrieved.", {
          type: "array",
          items: schemaRef("RateTrendPoint"),
        }),
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
};
