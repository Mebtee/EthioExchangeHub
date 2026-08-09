import type { OpenAPIV3_1 } from "openapi-types";

import { apiExamples } from "../examples";

/** Administrator profile as served by `GET /admin/profile`. */
export const adminProfileSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "The authenticated administrator's profile, sourced from their `users` row.",
  example: apiExamples.adminProfile,
  properties: {
    name: { type: "string", description: "Admin full name." },
    email: { type: "string", format: "email", description: "Admin email." },
    role: { type: "string", description: "Admin role label." },
    initials: { type: "string", description: "Avatar initials derived from the name." },
    memberSince: { type: "string", format: "date", description: "ISO date the admin was created." },
    lastLogin: {
      type: "string",
      format: "date-time",
      description: "ISO timestamp of the last login.",
    },
  },
  required: ["name", "email", "role", "initials", "memberSince", "lastLogin"],
};

/** Request body for `PUT /admin/profile` — any subset, at least one field. */
export const adminProfileInputSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "Payload for updating the admin profile. At least one field must be provided.",
  properties: {
    name: { type: "string", maxLength: 100, description: "Admin full name." },
    email: { type: "string", format: "email", maxLength: 254, description: "Admin email." },
    role: { type: "string", maxLength: 64, description: "Admin role label." },
  },
};

/** Platform settings as served by `GET /admin/settings`. */
export const adminSettingsSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "Persisted platform settings merged with the configured defaults.",
  example: apiExamples.adminSettings,
  properties: {
    siteName: { type: "string", description: "Public site name." },
    defaultCurrency: { type: "string", description: "Default display currency code." },
    refreshInterval: { type: "string", description: "Rate refresh cadence." },
    timezone: { type: "string", description: "IANA timezone identifier." },
    retentionDays: { type: "string", description: "Log retention window in days." },
    emailAlerts: { type: "boolean", description: "Email alerts enabled." },
    failureAlerts: { type: "boolean", description: "Scraper failure alerts enabled." },
    dailyDigest: { type: "boolean", description: "Daily digest enabled." },
    weeklyReport: { type: "boolean", description: "Weekly report enabled." },
  },
  required: [
    "siteName",
    "defaultCurrency",
    "refreshInterval",
    "timezone",
    "retentionDays",
    "emailAlerts",
    "failureAlerts",
    "dailyDigest",
    "weeklyReport",
  ],
};

/** Request body for `PUT /admin/settings` — any subset, at least one field. */
export const adminSettingsInputSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "Payload for updating platform settings. At least one field must be provided.",
  properties: adminSettingsSchema.properties,
};

/** One aggregated trend point returned by `GET /admin/dashboard/rate-trend`. */
export const rateTrendPointSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "Mean cash buying/selling rates across all banks and currencies on one rate date.",
  example: apiExamples.rateTrendPoint,
  properties: {
    label: { type: "string", format: "date", description: "Rate date (YYYY-MM-DD)." },
    cashBuying: { type: "number", description: "Mean cash buying rate." },
    cashSelling: { type: "number", description: "Mean cash selling rate." },
  },
  required: ["label", "cashBuying", "cashSelling"],
};
