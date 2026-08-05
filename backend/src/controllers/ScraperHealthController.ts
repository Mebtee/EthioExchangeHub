import type { Request, Response } from "express";

import { asyncHandler } from "@/middleware/async-handler";
import type { ScraperHealthService } from "@/services/ScraperHealthService";
import { successResponse } from "@/utils/api-response";

/**
 * HTTP adapter for scraper-health endpoints. Reads params, delegates to the
 * service, and returns the standard envelope. No business logic here.
 */
export class ScraperHealthController {
  constructor(private readonly scraperHealthService: ScraperHealthService) {}

  /** Returns the aggregate scraper-health summary and statistics. */
  getHealth = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const summary = await this.scraperHealthService.getSummary();
    successResponse(res, summary, "Scraper health summary retrieved.");
  });

  /** Returns every health row (per-scraper admin list), alphabetical by code. */
  getHealthList = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const rows = await this.scraperHealthService.listAll();
    successResponse(res, rows, "Scraper health list retrieved.");
  });

  /** Returns the health row for a single bank. */
  getHealthByBank = asyncHandler(
    async (req: Request<{ bankCode: string }>, res: Response): Promise<void> => {
      const health = await this.scraperHealthService.findByBankCode(req.params.bankCode);
      successResponse(res, health, "Scraper health retrieved.");
    },
  );
}
