import {
  arrayRef,
  nullableRef,
  pathParam,
  schemaRef,
  successResponse,
  type DocPathItem,
} from "../helpers";

/**
 * Featured-content endpoints (mounted under `/api/v1`).
 *
 * The public surface (`/featured`) is open; the admin surface
 * (`/admin/featured`) requires a bearer token with an admin role — enforced at
 * the composition root, not here.
 */
export const featuredPaths: Record<string, DocPathItem> = {
  "/featured": {
    get: {
      tags: ["Featured Content"],
      summary: "Get the active featured campaign",
      description:
        "Returns the single currently-eligible campaign for the homepage hero (active + inside its schedule window, lowest display_order first). Returns `data: null` when nothing is eligible — the UI renders no card.",
      operationId: "getActiveFeaturedContent",
      responses: {
        "200": successResponse("Featured content retrieved.", nullableRef("ActiveFeaturedContent")),
      },
    },
  },
  "/featured/{id}/click": {
    post: {
      tags: ["Featured Content"],
      summary: "Record a featured-card click",
      description:
        "Appends an anonymous click record (campaign id + destination type + timestamp; no personal data). Public and rate-limited with the rest of the API.",
      operationId: "recordFeaturedContentClick",
      parameters: [pathParam("id", "Featured-content id.", "uuid")],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: schemaRef("RecordFeaturedClickInput"),
          },
        },
      },
      responses: {
        "200": successResponse("Click recorded.", { type: "null" }),
        "404": { $ref: "#/components/responses/NotFound" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/admin/featured": {
    get: {
      tags: ["Featured Content"],
      summary: "List featured campaigns",
      description: "Lists every campaign (any state) with its aggregate click count. Admin only.",
      operationId: "listFeaturedContent",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": successResponse("Featured content retrieved.", arrayRef("FeaturedContentAdminItem")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
      },
    },
    post: {
      tags: ["Featured Content"],
      summary: "Create a featured campaign",
      description:
        "Creates a campaign, applying defaults for badge/cta labels, activity, and display order. Admin only.",
      operationId: "createFeaturedContent",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: schemaRef("FeaturedContentInput"),
          },
        },
      },
      responses: {
        "201": successResponse("Featured content created.", schemaRef("FeaturedContent")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/admin/featured/{id}": {
    get: {
      tags: ["Featured Content"],
      summary: "Get a featured campaign",
      description: "Returns a single campaign by id. Admin only.",
      operationId: "getFeaturedContent",
      security: [{ bearerAuth: [] }],
      parameters: [pathParam("id", "Featured-content id.", "uuid")],
      responses: {
        "200": successResponse("Featured content retrieved.", schemaRef("FeaturedContent")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
        "404": { $ref: "#/components/responses/NotFound" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
    patch: {
      tags: ["Featured Content"],
      summary: "Update a featured campaign",
      description:
        "Updates any subset of fields on a campaign. At least one field is required. Admin only.",
      operationId: "updateFeaturedContent",
      security: [{ bearerAuth: [] }],
      parameters: [pathParam("id", "Featured-content id.", "uuid")],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: schemaRef("FeaturedContentUpdateInput"),
          },
        },
      },
      responses: {
        "200": successResponse("Featured content updated.", schemaRef("FeaturedContent")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
        "404": { $ref: "#/components/responses/NotFound" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
    delete: {
      tags: ["Featured Content"],
      summary: "Delete a featured campaign",
      description: "Deletes a campaign by id. Admin only.",
      operationId: "deleteFeaturedContent",
      security: [{ bearerAuth: [] }],
      parameters: [pathParam("id", "Featured-content id.", "uuid")],
      responses: {
        "200": successResponse("Featured content deleted.", { type: "null" }),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
        "404": { $ref: "#/components/responses/NotFound" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
};
