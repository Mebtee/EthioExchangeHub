import { Router } from "express";

import type { ScrapeLogsController } from "@/controllers/ScrapeLogsController";
import { validateParams, validateQuery } from "@/middleware/validation";
import { runIdParamsSchema } from "@/validators/common";
import { scrapeLogsByRunQuerySchema, scrapeLogsQuerySchema } from "@/validators/scrape-logs";

/**
 * Scrape-log endpoints. Mounted at `/api/v1/scrape-logs`.
 *
 * Pure route definitions — paths, validation middleware, and controller
 * bindings only. The controller is injected by the composition root
 * (`routes/index.ts`) so no instance is ever created here.
 */
export function scrapeLogsRouter(controller: ScrapeLogsController): Router {
  const router = Router();

  router.get("/", validateQuery(scrapeLogsQuerySchema), controller.getLogs);
  router.get(
    "/:runId",
    validateParams(runIdParamsSchema),
    validateQuery(scrapeLogsByRunQuerySchema),
    controller.getLogsByRunId,
  );

  return router;
}
