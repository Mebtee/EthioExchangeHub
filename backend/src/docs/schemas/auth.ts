import type { OpenAPIV3_1 } from "openapi-types";

/** Authenticated admin user as returned by login and `/auth/me`. */
export const authUserSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "The authenticated administrator (backed by the persisted `users` row).",
  properties: {
    id: { type: "string", description: "User id." },
    name: { type: "string", description: "Display name." },
    email: { type: "string", format: "email", description: "Login email." },
    role: { type: "string", description: "Authorization role (e.g. admin / super_admin)." },
    avatarUrl: {
      type: ["string", "null"],
      format: "uri",
      description: "Optional avatar URL; the frontend falls back to initials.",
    },
  },
  required: ["id", "name", "email", "role"],
};

/** Signed token pair returned by login and refresh. */
export const authTokensSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "JWT token pair. The access token is short-lived; the refresh token is long-lived.",
  properties: {
    accessToken: { type: "string", description: "Bearer access token." },
    refreshToken: { type: "string", description: "Refresh token exchanged for a fresh pair." },
  },
  required: ["accessToken", "refreshToken"],
};

/** Login response: tokens + the authenticated user. */
export const authSessionSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "A successful authentication session.",
  properties: {
    tokens: { $ref: "#/components/schemas/AuthTokens" },
    user: { $ref: "#/components/schemas/AuthUser" },
  },
  required: ["tokens", "user"],
};

/** Request body for `POST /auth/login`. */
export const loginRequestSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "Credentials for the administrator login.",
  properties: {
    email: { type: "string", format: "email", maxLength: 254, description: "Admin email." },
    password: { type: "string", maxLength: 1024, description: "Admin password." },
  },
  required: ["email", "password"],
};

/** Request body for `POST /auth/refresh`. */
export const refreshRequestSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "A refresh token to exchange for a fresh token pair.",
  properties: {
    refreshToken: { type: "string", description: "The long-lived refresh token." },
  },
  required: ["refreshToken"],
};

/** Request body for `POST /auth/forgot-password`. */
export const forgotPasswordRequestSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "The email to issue a password reset for.",
  properties: {
    email: { type: "string", format: "email", maxLength: 254, description: "Account email." },
  },
  required: ["email"],
};

/** Request body for `POST /auth/reset-password`. */
export const resetPasswordRequestSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "A password-reset token plus the new password.",
  properties: {
    token: { type: "string", description: "Password-reset token issued by forgot-password." },
    password: { type: "string", minLength: 8, maxLength: 1024, description: "New password." },
  },
  required: ["token", "password"],
};
