import type { OpenAPIV3_1 } from "openapi-types";

import { env } from "@/utils/validate-env";
import { apiPaths } from "./paths";
import { commonResponses } from "./responses";
import {
  adminProfileInputSchema,
  adminProfileSchema,
  adminSettingsInputSchema,
  adminSettingsSchema,
  rateTrendPointSchema,
} from "./schemas/admin";
import {
  authSessionSchema,
  authTokensSchema,
  authUserSchema,
  forgotPasswordRequestSchema,
  loginRequestSchema,
  refreshRequestSchema,
  resetPasswordRequestSchema,
} from "./schemas/auth";
import { bankSchema } from "./schemas/bank";
import { contactMessageInputSchema, contactMessageSchema } from "./schemas/contact";
import { exchangeRateSchema } from "./schemas/exchange-rate";
import {
  activeFeaturedContentSchema,
  featuredContentAdminItemSchema,
  featuredContentInputSchema,
  featuredContentSchema,
  featuredContentUpdateInputSchema,
  recordFeaturedClickInputSchema,
} from "./schemas/featured";
import {
  manualRateInputSchema,
  manualRateSchema,
  manualRateUpdateInputSchema,
} from "./schemas/manual-rate";
import { newsCategorySchema, newsItemSchema } from "./schemas/news";
import { scraperHealthSchema, scraperHealthSummarySchema } from "./schemas/scraper-health";
import { scrapeLogSchema } from "./schemas/scrape-log";
import { apiTags } from "./tags";

/**
 * OpenAPI 3.1 document for the Ethio Exchange Hub API.
 *
 * IMPORTANT: this document DESCRIBES the API — it is never the source of
 * truth. The code is. It mirrors the actual controllers/routes/validators and
 * is kept accurate by construction (schemas mirror the database row types,
 * paths mirror the route tree). Authentication is currently not required; the
 * `bearerAuth` scheme is declared so it can be enforced later without
 * changing any endpoint definitions.
 */
export const openApiDocument: OpenAPIV3_1.Document = {
  openapi: "3.1.0",
  info: {
    title: "Ethio Exchange Hub API",
    version: "1.0.0",
    description: [
      "REST API for Ethio Exchange Hub: bank directory, exchange rates, manual rate overrides, and scraper operations.",
      "",
      "**Envelope**: every response uses `{ success, message, data }`. Success responses carry `success: true`; errors carry `success: false` with `data: null`.",
      "",
      "**Health**: the unversioned `GET /health` endpoint (outside `/api/v1`) reports server and database connectivity and is not listed in the paths above.",
      "",
      "**Operations (Phase 2K)**: unversioned infrastructure endpoints — `GET /live` (liveness, no DB call), `GET /ready` (readiness), and `GET /metrics` (Prometheus) — are also outside `/api/v1` and not listed above.",
      "",
      "**Authentication**: the admin surface (`/admin`, `/manual-rates`, `/auth/me`) requires a `bearerAuth` (JWT) access token obtained from `POST /auth/login`. All public endpoints (`/banks`, `/rates`, `/news`, `/featured`, `/scraper-health`, `/scrape-logs`) remain open. Protected operations declare `security: [{ bearerAuth: [] }]`.",
    ].join("\n"),
  },
  servers: [
    {
      url: `http://localhost:${env.PORT}/api/v1`,
      description: "Local development server",
    },
  ],
  security: [],
  tags: apiTags,
  // `apiPaths` is typed with the local `DocPathItem` shape (see helpers.ts);
  // the single boundary cast adapts it to the official 3.1 paths type.
  paths: apiPaths as unknown as OpenAPIV3_1.Document["paths"],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Access token from `POST /auth/login` (or the refreshed pair). Required on the admin surface.",
      },
    },
    schemas: {
      AdminProfile: adminProfileSchema,
      AdminProfileInput: adminProfileInputSchema,
      AdminSettings: adminSettingsSchema,
      AdminSettingsInput: adminSettingsInputSchema,
      RateTrendPoint: rateTrendPointSchema,
      AuthUser: authUserSchema,
      AuthTokens: authTokensSchema,
      AuthSession: authSessionSchema,
      LoginRequest: loginRequestSchema,
      RefreshRequest: refreshRequestSchema,
      ForgotPasswordRequest: forgotPasswordRequestSchema,
      ResetPasswordRequest: resetPasswordRequestSchema,
      Bank: bankSchema,
      ContactMessage: contactMessageSchema,
      ContactMessageInput: contactMessageInputSchema,
      ExchangeRate: exchangeRateSchema,
      FeaturedContent: featuredContentSchema,
      FeaturedContentAdminItem: featuredContentAdminItemSchema,
      ActiveFeaturedContent: activeFeaturedContentSchema,
      FeaturedContentInput: featuredContentInputSchema,
      FeaturedContentUpdateInput: featuredContentUpdateInputSchema,
      RecordFeaturedClickInput: recordFeaturedClickInputSchema,
      ManualRate: manualRateSchema,
      ManualRateInput: manualRateInputSchema,
      ManualRateUpdateInput: manualRateUpdateInputSchema,
      NewsItem: newsItemSchema,
      NewsCategory: newsCategorySchema,
      ScraperHealth: scraperHealthSchema,
      ScraperHealthSummary: scraperHealthSummarySchema,
      ScrapeLog: scrapeLogSchema,
    },
    responses: commonResponses,
  },
};
