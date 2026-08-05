import { Router } from "express";

import { BanksController } from "@/controllers/BanksController";
import { ExchangeRatesController } from "@/controllers/ExchangeRatesController";
import { ManualRatesController } from "@/controllers/ManualRatesController";
import { NewsController } from "@/controllers/NewsController";
import { ScraperHealthController } from "@/controllers/ScraperHealthController";
import { ScrapeLogsController } from "@/controllers/ScrapeLogsController";
import { BanksRepository } from "@/repositories/BanksRepository";
import { ExchangeRatesRepository } from "@/repositories/ExchangeRatesRepository";
import { ManualRatesRepository } from "@/repositories/ManualRatesRepository";
import { NewsService } from "@/services/NewsService";
import { ScraperHealthRepository } from "@/repositories/ScraperHealthRepository";
import { ScrapeLogsRepository } from "@/repositories/ScrapeLogsRepository";
import { BanksServiceImpl } from "@/services/BanksService";
import { ExchangeRatesServiceImpl } from "@/services/ExchangeRatesService";
import { ManualRatesServiceImpl } from "@/services/ManualRatesService";
import { ScraperHealthServiceImpl } from "@/services/ScraperHealthService";
import { ScrapeLogsServiceImpl } from "@/services/ScrapeLogsService";
import { banksRouter } from "./banks.routes";
import { exchangeRatesRouter } from "./exchange-rates.routes";
import { manualRatesRouter } from "./manual-rates.routes";
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
const exchangeRatesService = new ExchangeRatesServiceImpl(exchangeRatesRepository, banksService);
const exchangeRatesController = new ExchangeRatesController(exchangeRatesService);

const manualRatesRepository = new ManualRatesRepository();
const manualRatesService = new ManualRatesServiceImpl(manualRatesRepository, banksService);
const manualRatesController = new ManualRatesController(manualRatesService);

const newsService = new NewsService();
const newsController = new NewsController(newsService);

const scraperHealthRepository = new ScraperHealthRepository();
const scraperHealthService = new ScraperHealthServiceImpl(scraperHealthRepository);
const scraperHealthController = new ScraperHealthController(scraperHealthService);

const scrapeLogsRepository = new ScrapeLogsRepository();
const scrapeLogsService = new ScrapeLogsServiceImpl(scrapeLogsRepository);
const scrapeLogsController = new ScrapeLogsController(scrapeLogsService);

/** Versioned router exposed at `/api/v1`. */
export const apiRouter = Router();

apiRouter.use("/banks", banksRouter(banksController));
apiRouter.use("/rates", exchangeRatesRouter(exchangeRatesController));
apiRouter.use("/manual-rates", manualRatesRouter(manualRatesController));
apiRouter.use("/news", newsRouter(newsController));
apiRouter.use("/scraper-health", scraperHealthRouter(scraperHealthController));
apiRouter.use("/scrape-logs", scrapeLogsRouter(scrapeLogsController));
