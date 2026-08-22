import { Router } from "express";

import { AdminController } from "@/controllers/AdminController";
import { AdminPaymentController } from "@/controllers/AdminPaymentController";
import { AuthController } from "@/controllers/AuthController";
import { BanksController } from "@/controllers/BanksController";
import { CommercialApiController } from "@/controllers/CommercialApiController";
import { ContactController } from "@/controllers/ContactController";
import { CustomerApiKeysController } from "@/controllers/CustomerApiKeysController";
import { CustomerSubscriptionController } from "@/controllers/CustomerSubscriptionController";
import { CustomerUsageController } from "@/controllers/CustomerUsageController";
import { ExchangeRatesController } from "@/controllers/ExchangeRatesController";
import { FeaturedContentController } from "@/controllers/FeaturedContentController";
import { ManualRatesController } from "@/controllers/ManualRatesController";
import { NewsController } from "@/controllers/NewsController";
import { PaymentController } from "@/controllers/PaymentController";
import { ScraperHealthController } from "@/controllers/ScraperHealthController";
import { ScrapeLogsController } from "@/controllers/ScrapeLogsController";
import { createRequireAuth, requireRole } from "@/middleware/auth";
import { createAuthLimiter } from "@/middleware/rate-limit";
import { BanksRepository } from "@/repositories/BanksRepository";
import { ApiKeysRepository } from "@/repositories/ApiKeysRepository";
import { ApiPlansRepository } from "@/repositories/ApiPlansRepository";
import { ApiUsageRepository } from "@/repositories/ApiUsageRepository";
import { BankPaymentConfigRepository } from "@/repositories/BankPaymentConfigRepository";
import { PaymentReceiptsRepository } from "@/repositories/PaymentReceiptsRepository";
import { PaymentsRepository } from "@/repositories/PaymentsRepository";
import { ContactRepository } from "@/repositories/ContactRepository";
import { CustomersRepository } from "@/repositories/CustomersRepository";
import { ExchangeRatesRepository } from "@/repositories/ExchangeRatesRepository";
import { FeaturedContentClicksRepository } from "@/repositories/FeaturedContentClicksRepository";
import { FeaturedContentRepository } from "@/repositories/FeaturedContentRepository";
import { ManualRatesRepository } from "@/repositories/ManualRatesRepository";
import { NewsService } from "@/services/NewsService";
import { ScrapeLogsRepository } from "@/repositories/ScrapeLogsRepository";
import { SettingsRepository } from "@/repositories/SettingsRepository";
import { SubscriptionsRepository } from "@/repositories/SubscriptionsRepository";
import { UsersRepository } from "@/repositories/UsersRepository";
import { env } from "@/utils/validate-env";
import { AuthServiceImpl } from "@/services/AuthService";
import { BanksServiceImpl } from "@/services/BanksService";
import { ContactServiceImpl } from "@/services/ContactService";
import { ExchangeRatesServiceImpl } from "@/services/ExchangeRatesService";
import { FeaturedContentServiceImpl } from "@/services/FeaturedContentService";
import { ManualRatesServiceImpl } from "@/services/ManualRatesService";
import { ScraperHealthServiceImpl } from "@/services/ScraperHealthService";
import { ScrapeLogsServiceImpl } from "@/services/ScrapeLogsService";
import { SettingsServiceImpl } from "@/services/SettingsService";
import { CustomerApiKeysServiceImpl } from "@/services/CustomerApiKeysService";
import { CustomerSubscriptionServiceImpl } from "@/services/CustomerSubscriptionService";
import { CustomerUsageServiceImpl } from "@/services/CustomerUsageService";
import { AdminPaymentServiceImpl } from "@/services/AdminPaymentService";
import { PaymentServiceImpl } from "@/services/PaymentService";
import { SupabaseReceiptStorage } from "@/lib/receipt-storage";
import { ResendEmailService } from "@/services/EmailService";
import { adminRouter, adminPaymentRouter } from "./admin.routes";
import { authRouter } from "./auth.routes";
import { banksRouter } from "./banks.routes";
import { contactRouter } from "./contact.routes";
import {
  customerApiKeysRouter,
  customerPaymentRouter,
  customerSubscriptionRouter,
  customerUsageRouter,
} from "./customer.routes";
import { exchangeRatesRouter } from "./exchange-rates.routes";
import { featuredAdminRouter, featuredRouter } from "./featured.routes";
import { manualRatesRouter } from "./manual-rates.routes";
import { newsRouter } from "./news.routes";
import { commercialPublicRouter } from "./public.routes";
import { scraperHealthRouter } from "./scraper-health.routes";
import { scrapeLogsRouter } from "./scrape-logs.routes";

/**
 * Composition root for the `/api/v1` surface.
 *
 * Wires the full dependency graph exactly once at module load: repositories
 * default to the shared Supabase singleton client, services receive their
 * repositories (and the shared `BanksService` where cross-domain validation is
 * needed), and controllers receive their services. Every instance is a
 * module-level singleton — nothing is created per request.
 *
 * Route files themselves only define paths and bind the injected controller;
 * no business logic exists anywhere in this layer.
 */
const banksRepository = new BanksRepository();
const banksService = new BanksServiceImpl(banksRepository);
const banksController = new BanksController(banksService);

const exchangeRatesRepository = new ExchangeRatesRepository();
const manualRatesRepository = new ManualRatesRepository();
// Manual overrides participate in public rate resolution, so the rates
// service receives the shared manual-rates repository alongside its own.
// The staleness window (D2) is injected from env — never read from the clock
// inside the service.
const exchangeRatesService = new ExchangeRatesServiceImpl(
  exchangeRatesRepository,
  banksService,
  manualRatesRepository,
  env.MAX_RATE_AGE_DAYS,
);
const exchangeRatesController = new ExchangeRatesController(exchangeRatesService);

const manualRatesService = new ManualRatesServiceImpl(manualRatesRepository, banksService);
const manualRatesController = new ManualRatesController(manualRatesService);

const newsService = new NewsService();
const newsController = new NewsController(newsService);

// Featured content: the admin CRUD surface and the append-only click log share
// one service. The homepage selection rule (is_active + schedule window +
// display order) lives entirely in FeaturedContentService — this composition
// root only wires repositories together.
const featuredContentRepository = new FeaturedContentRepository();
const featuredClicksRepository = new FeaturedContentClicksRepository();
const featuredContentService = new FeaturedContentServiceImpl(
  featuredContentRepository,
  featuredClicksRepository,
);
const featuredContentController = new FeaturedContentController(featuredContentService);

// Public contact form — submissions are persisted to Supabase first (the
// source of truth); the Resend-backed email service then best-effort forwards
// each message to the support inbox (CONTACT_EMAIL_TO). Sending is enabled
// only when RESEND_API_KEY + CONTACT_EMAIL_FROM are configured (see
// services/EmailService.ts) — otherwise messages are still stored and the API
// still answers 201.
const contactRepository = new ContactRepository();
const contactEmailService = new ResendEmailService({
  apiKey: env.RESEND_API_KEY,
  fromEmail: env.CONTACT_EMAIL_FROM,
  toEmail: env.CONTACT_EMAIL_TO,
});
const contactService = new ContactServiceImpl(contactRepository, contactEmailService);
const contactController = new ContactController(contactService);

// Scraper health is DERIVED from scrape_logs (no scraper_health table), so
// both services share the single scrape-logs repository instance.
const scrapeLogsRepository = new ScrapeLogsRepository();
const scraperHealthService = new ScraperHealthServiceImpl(
  scrapeLogsRepository,
  env.MAX_RATE_AGE_DAYS,
);
const scraperHealthController = new ScraperHealthController(scraperHealthService);
const scrapeLogsService = new ScrapeLogsServiceImpl(scrapeLogsRepository);
const scrapeLogsController = new ScrapeLogsController(scrapeLogsService);

const settingsRepository = new SettingsRepository();
const usersRepository = new UsersRepository();
const settingsService = new SettingsServiceImpl(settingsRepository, usersRepository);
const adminController = new AdminController(settingsService, exchangeRatesService);

// ---- Authentication (A1/A2, customer registration in Phase 2A) ----
// The users repository backs both the auth service (login/register/refresh/me)
// and the `requireAuth` guard that protects the admin surface. The bootstrap
// admin is provisioned from server configuration on first login (never
// hardcoded in a controller). Registration additionally writes the one-to-one
// `customers` profile row. Sensitive routers are mounted behind requireAuth +
// requireRole so they are unreachable without a valid admin session.
const customersRepository = new CustomersRepository();
const authService = new AuthServiceImpl(usersRepository, customersRepository, {
  jwtSecret: env.JWT_SECRET,
  accessTokenExpiresIn: env.JWT_EXPIRES_IN,
  refreshTokenExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
  passwordResetTokenExpiresIn: env.PASSWORD_RESET_TOKEN_EXPIRES_IN,
  adminEmail: env.ADMIN_EMAIL,
  adminPassword: env.ADMIN_PASSWORD,
});
const authController = new AuthController(authService);
const requireAuth = createRequireAuth(usersRepository);
const requireAdmin = requireRole("admin", "super_admin");

// ---- Customer self-service (Phase 2B/2C) ----
// The SAME `requireAuth` guard protects this surface; the customer role check
// is applied at the mount point so every `/customer/*` route is unreachable
// for admins and anonymous callers alike. Isolation is enforced inside the
// services: the owning `customers.id` is always resolved from the JWT
// subject, never from client input.
const apiKeysRepository = new ApiKeysRepository();
const subscriptionsRepository = new SubscriptionsRepository();
const apiPlansRepository = new ApiPlansRepository();

const customerApiKeysService = new CustomerApiKeysServiceImpl(
  customersRepository,
  apiKeysRepository,
  subscriptionsRepository,
  apiPlansRepository,
);
const customerApiKeysController = new CustomerApiKeysController(customerApiKeysService);

const customerSubscriptionService = new CustomerSubscriptionServiceImpl(
  customersRepository,
  subscriptionsRepository,
  apiPlansRepository,
);
const customerSubscriptionController = new CustomerSubscriptionController(
  customerSubscriptionService,
);

// ---- Manual bank-transfer payments (Phase 3) ----
// Same guards, same isolation rules. Money fields (amount/currency/status/
// reference) are derived server-side in the services; receipts live in a
// PRIVATE Supabase Storage bucket and are exposed only as short-lived signed
// URLs to reviewing admins.
const paymentsRepository = new PaymentsRepository();
const paymentReceiptsRepository = new PaymentReceiptsRepository();
const bankPaymentConfigRepository = new BankPaymentConfigRepository();
const receiptStorage = new SupabaseReceiptStorage();

const paymentService = new PaymentServiceImpl(
  customersRepository,
  subscriptionsRepository,
  apiPlansRepository,
  paymentsRepository,
  paymentReceiptsRepository,
  bankPaymentConfigRepository,
  receiptStorage,
);
const paymentController = new PaymentController(paymentService);

const adminPaymentService = new AdminPaymentServiceImpl(
  paymentsRepository,
  paymentReceiptsRepository,
  subscriptionsRepository,
  bankPaymentConfigRepository,
  receiptStorage,
);
const adminPaymentController = new AdminPaymentController(adminPaymentService);

// ---- Public commercial API (Phase 4) ----
// `PAID SUBSCRIPTION → API KEY → AUTHENTICATED API ACCESS → RATE LIMIT →
// MONTHLY QUOTA → USAGE`. The commercial surface is a GATED VIEW over the
// same exchange-rate/banks services the free website uses — one data model,
// no duplicated business logic. The middleware chain (auth → RPM → quota →
// meter) is assembled inside `commercialPublicRouter`.
const apiUsageRepository = new ApiUsageRepository();
const customerUsageService = new CustomerUsageServiceImpl(
  customersRepository,
  apiKeysRepository,
  subscriptionsRepository,
  apiPlansRepository,
  apiUsageRepository,
);
const customerUsageController = new CustomerUsageController(customerUsageService);
const commercialApiController = new CommercialApiController(exchangeRatesService, banksService);

/** Versioned router exposed at `/api/v1`. */
export const apiRouter = Router();

// The auth surface gets its own tighter rate limit (brute-force protection)
// in addition to the general API limiter mounted in app.ts.
apiRouter.use("/auth", createAuthLimiter(), authRouter(authController, requireAuth));
apiRouter.use(
  "/admin",
  requireAuth,
  requireAdmin,
  adminRouter(adminController),
  adminPaymentRouter(adminPaymentController),
);
apiRouter.use(
  "/customer",
  requireAuth,
  requireRole("customer"),
  customerApiKeysRouter(customerApiKeysController),
  customerSubscriptionRouter(customerSubscriptionController),
  customerPaymentRouter(paymentController),
  customerUsageRouter(customerUsageController),
);
apiRouter.use(
  "/public",
  commercialPublicRouter({
    apiKeysRepository,
    customersRepository,
    subscriptionsRepository,
    apiPlansRepository,
    apiUsageRepository,
    controller: commercialApiController,
  }),
);
apiRouter.use("/banks", banksRouter(banksController));
apiRouter.use("/rates", exchangeRatesRouter(exchangeRatesController));
apiRouter.use("/manual-rates", requireAuth, requireAdmin, manualRatesRouter(manualRatesController));
apiRouter.use("/news", newsRouter(newsController));
apiRouter.use("/featured", featuredRouter(featuredContentController));
apiRouter.use(
  "/admin/featured",
  requireAuth,
  requireAdmin,
  featuredAdminRouter(featuredContentController),
);
apiRouter.use("/contact", contactRouter(contactController));
apiRouter.use(
  "/scraper-health",
  requireAuth,
  requireAdmin,
  scraperHealthRouter(scraperHealthController),
);
apiRouter.use("/scrape-logs", requireAuth, requireAdmin, scrapeLogsRouter(scrapeLogsController));
