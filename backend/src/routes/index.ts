import { Router } from "express";

import { AdminController } from "@/controllers/AdminController";
import { AuthController } from "@/controllers/AuthController";
import { BanksController } from "@/controllers/BanksController";
import { ExchangeRatesController } from "@/controllers/ExchangeRatesController";
import { ManualRatesController } from "@/controllers/ManualRatesController";
import { NewsController } from "@/controllers/NewsController";
import { ScraperHealthController } from "@/controllers/ScraperHealthController";
import { ScrapeLogsController } from "@/controllers/ScrapeLogsController";
import { createRequireAuth, requireRole } from "@/middleware/auth";
import { createAuthLimiter } from "@/middleware/rate-limit";
import { BanksRepository } from "@/repositories/BanksRepository";
import { ExchangeRatesRepository } from "@/repositories/ExchangeRatesRepository";
import { ManualRatesRepository } from "@/repositories/ManualRatesRepository";
import { NewsService } from "@/services/NewsService";
import { ScraperHealthRepository } from "@/repositories/ScraperHealthRepository";
import { ScrapeLogsRepository } from "@/repositories/ScrapeLogsRepository";
import { SettingsRepository } from "@/repositories/SettingsRepository";
import { UsersRepository } from "@/repositories/UsersRepository";
import { env } from "@/utils/validate-env";
import { AuthServiceImpl } from "@/services/AuthService";
import { BanksServiceImpl } from "@/services/BanksService";
import { ExchangeRatesServiceImpl } from "@/services/ExchangeRatesService";
import { ManualRatesServiceImpl } from "@/services/ManualRatesService";
import { ScraperHealthServiceImpl } from "@/services/ScraperHealthService";
import { ScrapeLogsServiceImpl } from "@/services/ScrapeLogsService";
import { SettingsServiceImpl } from "@/services/SettingsService";
import { adminRouter } from "./admin.routes";
import { authRouter } from "./auth.routes";
import { banksRouter } from "./banks.routes";
import { exchangeRatesRouter } from "./exchange-rates.routes";
import { manualRatesRouter } from "./manual-rates.routes";
import { marketTickerRouter } from "./market-ticker.routes";
import { newsRouter } from "./news.routes";
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

const scraperHealthRepository = new ScraperHealthRepository();
const scraperHealthService = new ScraperHealthServiceImpl(
  scraperHealthRepository,
  env.MAX_RATE_AGE_DAYS,
);
const scraperHealthController = new ScraperHealthController(scraperHealthService);

const scrapeLogsRepository = new ScrapeLogsRepository();
const scrapeLogsService = new ScrapeLogsServiceImpl(scrapeLogsRepository);
const scrapeLogsController = new ScrapeLogsController(scrapeLogsService);

const settingsRepository = new SettingsRepository();
const settingsService = new SettingsServiceImpl(settingsRepository);
const adminController = new AdminController(settingsService, exchangeRatesService);

// ---- Authentication (A1/A2) ----
// The users repository backs both the auth service (login/refresh/me) and the
// `requireAuth` guard that protects the admin surface. The bootstrap admin is
// provisioned from server configuration on first login (never hardcoded in a
// controller). Sensitive routers are mounted behind requireAuth + requireRole
// so they are unreachable without a valid admin session.
const usersRepository = new UsersRepository();
const authService = new AuthServiceImpl(usersRepository, {
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

/** Versioned router exposed at `/api/v1`. */
export const apiRouter = Router();

// The auth surface gets its own tighter rate limit (brute-force protection)
// in addition to the general API limiter mounted in app.ts.
apiRouter.use("/auth", createAuthLimiter(), authRouter(authController, requireAuth));
apiRouter.use("/admin", requireAuth, requireAdmin, adminRouter(adminController));
apiRouter.use("/banks", banksRouter(banksController));
apiRouter.use("/rates", exchangeRatesRouter(exchangeRatesController));
// Homepage market ticker — derived from the persisted exchange_rates rows.
apiRouter.use("/market-ticker", marketTickerRouter(exchangeRatesController));
apiRouter.use("/manual-rates", requireAuth, requireAdmin, manualRatesRouter(manualRatesController));
apiRouter.use("/news", newsRouter(newsController));
apiRouter.use("/scraper-health", scraperHealthRouter(scraperHealthController));
apiRouter.use("/scrape-logs", scrapeLogsRouter(scrapeLogsController));
