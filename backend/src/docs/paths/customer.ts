import { arrayRef, pathParam, schemaRef, successResponse, type DocPathItem } from "../helpers";

/**
 * Customer self-service endpoints (Phase 2B/2C). Mounted under
 * `/api/v1/customer`, behind `requireAuth` + `requireRole("customer")`.
 */
export const customerApiKeysPaths: Record<string, DocPathItem> = {
  "/customer/plans": {
    get: {
      tags: ["Customer Subscription"],
      summary: "List active API plans",
      description:
        "Returns the active commercial API plans in catalog order with pricing and limits. Requires a customer bearer token.",
      operationId: "listCustomerPlans",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": successResponse("Plans retrieved.", arrayRef("CustomerPlan")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
      },
    },
  },
  "/customer/subscription": {
    get: {
      tags: ["Customer Subscription"],
      summary: "Get current subscription",
      description:
        "Returns the authenticated customer's latest subscription of any status. Answers 404 when the customer has none — no record is created implicitly.",
      operationId: "getCustomerSubscription",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": successResponse("Subscription retrieved.", schemaRef("CustomerSubscription")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
    post: {
      tags: ["Customer Subscription"],
      summary: "Select a plan",
      description:
        "Creates a subscription for the authenticated customer by plan choice ONLY — status, price, currency, and billing periods are backend-controlled and cannot be supplied. Free plans (price 0) activate immediately; paid plans are created as `pending` and become active only after manual bank-transfer approval (payment phase). Selecting another plan while one is pending/active/suspended answers 409.",
      operationId: "createCustomerSubscription",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: schemaRef("CreateCustomerSubscriptionInput") },
        },
      },
      responses: {
        "201": successResponse("Subscription created.", schemaRef("CustomerSubscription")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
        "404": { $ref: "#/components/responses/NotFound" },
        "409": { $ref: "#/components/responses/Conflict" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/customer/api-keys": {
    post: {
      tags: ["Customer API Keys"],
      summary: "Create an API key",
      description:
        "Creates an API key for the authenticated customer. REQUIRES an active subscription — the plan's max_api_keys caps simultaneously non-revoked keys (409 when reached or when no active subscription exists; select a plan via POST /customer/subscription). The response carries the complete secret (`key`, `eeh_live_...`) EXACTLY ONCE — only the SHA-256 hash and the public prefix are stored, so the secret can never be retrieved again. Requires a customer bearer token; each customer only ever sees and owns their own keys.",
      operationId: "createCustomerApiKey",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: schemaRef("CreateCustomerApiKeyInput") },
        },
      },
      responses: {
        "201": successResponse("API key created successfully.", schemaRef("CustomerApiKeyCreated")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
        "404": { $ref: "#/components/responses/NotFound" },
        "409": { $ref: "#/components/responses/Conflict" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
    get: {
      tags: ["Customer API Keys"],
      summary: "List API keys",
      description:
        "Lists the authenticated customer's API keys, newest first. Returns public prefixes and status fields only — never the full secret or its stored hash. Revoked and expired keys remain listed with their status timestamps.",
      operationId: "listCustomerApiKeys",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": successResponse("API keys retrieved.", arrayRef("CustomerApiKey")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
        "404": { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/customer/api-keys/{id}": {
    delete: {
      tags: ["Customer API Keys"],
      summary: "Revoke an API key",
      description:
        "Secure revocation: stamps `revokedAt` on the key without deleting the row. Idempotent — revoking an already-revoked key returns it unchanged. Only keys owned by the authenticated customer can be revoked; any other id answers 404.",
      operationId: "revokeCustomerApiKey",
      security: [{ bearerAuth: [] }],
      parameters: [pathParam("id", "API key id.", "uuid")],
      responses: {
        "200": successResponse("API key revoked.", schemaRef("CustomerApiKey")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
        "404": { $ref: "#/components/responses/NotFound" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
};

/**
 * Customer manual bank-transfer payment endpoints (Phase 3). Mounted under
 * `/api/v1/customer`, behind `requireAuth` + `requireRole("customer")`.
 */
export const customerPaymentPaths: Record<string, DocPathItem> = {
  "/customer/payment-methods": {
    get: {
      tags: ["Customer Payments"],
      summary: "List active bank accounts",
      description:
        "Returns the ACTIVE bank accounts configured by admins, with transfer instructions. Inactive accounts are never exposed. Requires a customer bearer token.",
      operationId: "listCustomerPaymentMethods",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": successResponse("Payment methods retrieved.", arrayRef("BankAccount")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
      },
    },
  },
  "/customer/payments": {
    post: {
      tags: ["Customer Payments"],
      summary: "Submit a bank-transfer payment",
      description:
        "Submits a manual bank-transfer payment for one of the caller's PENDING subscriptions. The request carries ONLY the subscription choice and the customer's bank transaction reference — amount and currency are copied server-side from the plan, status starts as `pending`, and the payment reference is system-generated. Duplicate protection: one open (pending/under_review/approved) payment per subscription and a transaction reference usable once per customer.",
      operationId: "submitCustomerPayment",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: { "application/json": { schema: schemaRef("SubmitPaymentInput") } },
      },
      responses: {
        "201": successResponse("Payment submitted.", schemaRef("CustomerPayment")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
        "404": { $ref: "#/components/responses/NotFound" },
        "409": { $ref: "#/components/responses/Conflict" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
    get: {
      tags: ["Customer Payments"],
      summary: "List my payments",
      description:
        "Lists the authenticated customer's payments, newest first. Isolation is structural — query parameters cannot reference another customer.",
      operationId: "listCustomerPayments",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": successResponse("Payments retrieved.", arrayRef("CustomerPayment")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
      },
    },
  },
  "/customer/payments/{id}/receipt": {
    post: {
      tags: ["Customer Payments"],
      summary: "Upload a payment receipt",
      description:
        "Uploads proof of payment (screenshot or PDF) for one of the caller's payments while review is still possible. Multipart field name: `receipt`. Accepts PNG/JPEG/WEBP images or PDF up to 5 MB; the file CONTENT must match its declared type (magic bytes are verified — extensions are not trusted). One receipt per payment; storage paths are generated server-side in a PRIVATE bucket and never exposed.",
      operationId: "uploadCustomerReceipt",
      security: [{ bearerAuth: [] }],
      parameters: [pathParam("id", "Payment id.", "uuid")],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: {
                receipt: {
                  type: "string",
                  format: "binary",
                  description: "PNG, JPEG, WEBP or PDF, max 5 MB.",
                },
              },
              required: ["receipt"],
            },
          },
        },
      },
      responses: {
        "201": successResponse("Receipt uploaded.", schemaRef("ReceiptUploadResult")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "403": { $ref: "#/components/responses/AuthorizationError" },
        "404": { $ref: "#/components/responses/NotFound" },
        "409": { $ref: "#/components/responses/Conflict" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
};
