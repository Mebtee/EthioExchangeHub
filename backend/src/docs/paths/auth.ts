import { schemaRef, successResponse, type DocPathItem } from "../helpers";

/** Auth endpoints (mounted under `/api/v1`). */
export const authPaths: Record<string, DocPathItem> = {
  "/auth/login": {
    post: {
      tags: ["Auth"],
      summary: "Login",
      description:
        "Exchanges administrator credentials for an access/refresh token pair plus the user. The bootstrap admin is provisioned from server configuration on first login.",
      operationId: "login",
      requestBody: {
        required: true,
        content: { "application/json": { schema: schemaRef("LoginRequest") } },
      },
      responses: {
        "200": successResponse("Login successful.", schemaRef("AuthSession")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/auth/register": {
    post: {
      tags: ["Auth"],
      summary: "Register customer",
      description:
        "Creates a customer account: a `users` row with role `customer` plus its one-to-one `customers` profile. The password is stored hashed and never returned; no tokens are issued here — sign in via `/auth/login` afterwards.",
      operationId: "registerCustomer",
      requestBody: {
        required: true,
        content: { "application/json": { schema: schemaRef("RegisterRequest") } },
      },
      responses: {
        "201": successResponse("Registration successful.", schemaRef("AuthUser")),
        "409": { $ref: "#/components/responses/Conflict" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/auth/refresh": {
    post: {
      tags: ["Auth"],
      summary: "Refresh tokens",
      description: "Exchanges a valid refresh token for a fresh access/refresh token pair.",
      operationId: "refreshTokens",
      requestBody: {
        required: true,
        content: { "application/json": { schema: schemaRef("RefreshRequest") } },
      },
      responses: {
        "200": successResponse("Tokens refreshed.", schemaRef("AuthTokens")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/auth/logout": {
    post: {
      tags: ["Auth"],
      summary: "Logout",
      description:
        "Ends the session client-side. The API is stateless, so this is a best-effort success — the client discards its stored tokens.",
      operationId: "logout",
      responses: {
        "200": successResponse("Logged out.", { type: "null" }),
      },
    },
  },
  "/auth/me": {
    get: {
      tags: ["Auth"],
      summary: "Current user",
      description: "Resolves the authenticated user from the access token.",
      operationId: "getCurrentUser",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": successResponse("Authenticated user retrieved.", schemaRef("AuthUser")),
        "401": { $ref: "#/components/responses/AuthenticationError" },
      },
    },
  },
  "/auth/forgot-password": {
    post: {
      tags: ["Auth"],
      summary: "Request password reset",
      description:
        "Issues a password-reset token for the given email. Always answers `{ sent: true }` so the endpoint cannot be used to enumerate accounts; the token is delivered via the operator log until a mailer is wired.",
      operationId: "forgotPassword",
      requestBody: {
        required: true,
        content: { "application/json": { schema: schemaRef("ForgotPasswordRequest") } },
      },
      responses: {
        "200": successResponse("Password reset issued.", {
          type: "object",
          properties: { sent: { type: "boolean" } },
          required: ["sent"],
        }),
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/auth/reset-password": {
    post: {
      tags: ["Auth"],
      summary: "Reset password",
      description: "Verifies the reset token and persists the new password.",
      operationId: "resetPassword",
      requestBody: {
        required: true,
        content: { "application/json": { schema: schemaRef("ResetPasswordRequest") } },
      },
      responses: {
        "200": successResponse("Password updated.", { type: "null" }),
        "401": { $ref: "#/components/responses/AuthenticationError" },
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
};
