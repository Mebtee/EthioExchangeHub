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
  registerRequestSchema,
  resetPasswordRequestSchema,
} from "./schemas/auth";
import { bankSchema } from "./schemas/bank";
import {
  customerApiKeyCreatedSchema,
  customerApiKeySchema,
  createCustomerApiKeyInputSchema,
} from "./schemas/api-key";
import {
  createCustomerSubscriptionInputSchema,
  customerPlanSchema,
  customerSubscriptionSchema,
} from "./schemas/subscription";
import { customerUsageSchema, keyUsageSchema, usageKeySchema } from "./schemas/commercial";
import {
  adminBankAccountSchema,
  adminPaymentSchema,
  bankAccountSchema,
  createBankAccountInputSchema,
  customerPaymentSchema,
  receiptUploadResultSchema,
  receiptUrlResponseSchema,
  reviewPaymentInputSchema,
  submitPaymentInputSchema,
  updateBankAccountInputSchema,
} from "./schemas/payment";
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
 * paths mirror the route tree). Authentication is enforced on the admin surface
 * via JWT bearer tokens; the `bearerAuth` scheme is declared below.
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
      "**Authentication**: the admin surface (`/admin`, `/manual-rates`, `/auth/me`, `/scraper-health`, `/scrape-logs`) requires a `bearerAuth` (JWT) access token obtained from `POST /auth/login`. Public endpoints (`/banks`, `/rates`, `/news`, `/featured`, `/contact`) remain open. Protected operations declare `security: [{ bearerAuth: [] }]`.",
      "",
      "**Commercial API (Phase 4)**: the paid data API at `/public/*` uses a DIFFERENT credential — an API key (`commercialApiKey` scheme, `Authorization: Bearer eeh_live_…`) created via the customer dashboard endpoints. Every commercial request must resolve to an ACTIVE subscription within its billing period; the plan's requests-per-minute and monthly request quota are enforced (HTTP 429 with distinct messages). Customers inspect their consumption at `GET /customer/usage`.",
    ].join("\n"),
  },
  servers: [
    {
      url: env.OPENAPI_SERVER_URL || `http://localhost:${env.PORT}/api/v1`,
      description: env.OPENAPI_SERVER_URL ? "Configured server" : "Local development server",
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
      commercialApiKey: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "eeh_live_…",
        description:
          "Commercial API key (Phase 4) created at `POST /customer/api-keys`. The full secret `eeh_live_…` is shown exactly once at creation; send it as `Authorization: Bearer eeh_live_YOUR_API_KEY`. NEVER a customer login token — JWTs are rejected on `/public/*`.",
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
      RegisterRequest: registerRequestSchema,
      RefreshRequest: refreshRequestSchema,
      ForgotPasswordRequest: forgotPasswordRequestSchema,
      ResetPasswordRequest: resetPasswordRequestSchema,
      Bank: bankSchema,
      CustomerApiKey: customerApiKeySchema,
      CustomerApiKeyCreated: customerApiKeyCreatedSchema,
      CreateCustomerApiKeyInput: createCustomerApiKeyInputSchema,
      CustomerPlan: customerPlanSchema,
      CustomerSubscription: customerSubscriptionSchema,
      CreateCustomerSubscriptionInput: createCustomerSubscriptionInputSchema,
      UsageKey: usageKeySchema,
      CustomerUsage: customerUsageSchema,
      KeyUsage: keyUsageSchema,
      BankAccount: bankAccountSchema,
      CustomerPayment: customerPaymentSchema,
      SubmitPaymentInput: submitPaymentInputSchema,
      ReceiptUploadResult: receiptUploadResultSchema,
      AdminPayment: adminPaymentSchema,
      ReviewPaymentInput: reviewPaymentInputSchema,
      ReceiptUrlResponse: receiptUrlResponseSchema,
      AdminBankAccount: adminBankAccountSchema,
      CreateBankAccountInput: createBankAccountInputSchema,
      UpdateBankAccountInput: updateBankAccountInputSchema,
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
