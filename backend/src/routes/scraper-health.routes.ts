import { Router } from "express";

import type { ScraperHealthController } from "@/controllers/ScraperHealthController";
import { validateParams } from "@/middleware/validation";
import { scraperHealthParamsSchema } from "@/validators/scraper-health";

/**
 * Scraper-health endpoints. Mounted at `/api/v1/scraper-health`.
 *
 * Pure route definitions — paths, validation middleware, and controller
 * bindings only. The controller is injected by the composition root
 * (`routes/index.ts`) so no instance is ever created here.
 */
export function scraperHealthRouter(controller: ScraperHealthController): Router {
  const router = Router();

  router.get("/", controller.getHealth);
  // The literal /list route must be registered BEFORE /:bankCode so "list"
  // is never parsed as a bank code.
  router.get("/list", controller.getHealthList);
  router.get("/:bankCode", validateParams(scraperHealthParamsSchema), controller.getHealthByBank);

  return router;
}
