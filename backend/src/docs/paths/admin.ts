import {
  arrayRef,
  pathParam,
  queryParam,
  schemaRef,
  successResponse,
  type DocPathItem,
} from "../helpers";

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

/**
 * Admin payment-review and bank-configuration endpoints (Phase 3). Mounted
 * under `/api/v1/admin`, behind `requireAuth` + `requireRole("admin","super_admin")`.
 */
export const adminPaymentPaths: Record<string, DocPathItem> = {
  "/admin/payments": {
    get: {
      tags: ["Admin Payments"],
      summary: "List payments",
      description:
        "Lists submitted payments, newest first. Optionally filter by status with `?status=`. Requires an admin or super_admin bearer token.",
      operationId: "listAdminPayments",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "status",
          in: "query",
          required: false,
          schema: {
            type: "string",
            enum: ["pending", "under_review", "approved", "rejected", "cancelled"],
          },
        },
      ],
      responses: {
        "200": successResponse("Payments retrieved.", arrayRef("AdminPayment")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/admin/payments/{id}": {
    get: {
      tags: ["Admin Payments"],
      summary: "Inspect a payment",
      description: "Returns one payment including the reviewer identity when reviewed.",
      operationId: "getAdminPayment",
      security: [{ bearerAuth: [] }],
      parameters: [pathParam("id", "Payment id.", "uuid")],
      responses: {
        "200": successResponse("Payment retrieved.", schemaRef("AdminPayment")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
        "404": { $ref: "#/components/responses/NotFound" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/admin/payments/{id}/review": {
    post: {
      tags: ["Admin Payments"],
      summary: "Review a payment",
      description:
        "Applies a review transition. `under_review` moves a pending payment into review. `approve` records reviewer identity/time AND ACTIVATES the associated subscription with a fresh one-month billing period — exactly once; re-approving answers 409 without side effects. `reject` requires `rejection_reason`. Rejected/cancelled payments are terminal.",
      operationId: "reviewAdminPayment",
      security: [{ bearerAuth: [] }],
      parameters: [pathParam("id", "Payment id.", "uuid")],
      requestBody: {
        required: true,
        content: { "application/json": { schema: schemaRef("ReviewPaymentInput") } },
      },
      responses: {
        "200": successResponse("Payment approved.", schemaRef("AdminPayment")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
        "404": { $ref: "#/components/responses/NotFound" },
        "409": { $ref: "#/components/responses/Conflict" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/admin/payments/{id}/receipt": {
    get: {
      tags: ["Admin Payments"],
      summary: "View an uploaded receipt",
      description:
        "Returns a SHORT-LIVED signed URL for the receipt stored in the private bucket. Receipts are never public and raw storage paths are never exposed.",
      operationId: "getAdminReceiptUrl",
      security: [{ bearerAuth: [] }],
      parameters: [pathParam("id", "Payment id.", "uuid")],
      responses: {
        "200": successResponse("Receipt URL generated.", schemaRef("ReceiptUrlResponse")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
        "404": { $ref: "#/components/responses/NotFound" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/admin/payment-methods": {
    get: {
      tags: ["Admin Bank Configuration"],
      summary: "List bank accounts",
      description: "ALL configured bank accounts, including inactive ones.",
      operationId: "listAdminBankAccounts",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": successResponse("Bank accounts retrieved.", arrayRef("AdminBankAccount")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
      },
    },
    post: {
      tags: ["Admin Bank Configuration"],
      summary: "Create a bank account",
      description: "Adds a bank account for manual transfers (active by default).",
      operationId: "createAdminBankAccount",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: { "application/json": { schema: schemaRef("CreateBankAccountInput") } },
      },
      responses: {
        "201": successResponse("Bank account created.", schemaRef("AdminBankAccount")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/admin/payment-methods/{id}": {
    patch: {
      tags: ["Admin Bank Configuration"],
      summary: "Update a bank account",
      description:
        "Partial update of any field, including activate/deactivate via `is_active`. Inactive accounts disappear from customer listings immediately.",
      operationId: "updateAdminBankAccount",
      security: [{ bearerAuth: [] }],
      parameters: [pathParam("id", "Bank config id.", "uuid")],
      requestBody: {
        required: true,
        content: { "application/json": { schema: schemaRef("UpdateBankAccountInput") } },
      },
      responses: {
        "200": successResponse("Bank account updated.", schemaRef("AdminBankAccount")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
        "404": { $ref: "#/components/responses/NotFound" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
};
