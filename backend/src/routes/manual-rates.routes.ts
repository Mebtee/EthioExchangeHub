import { Router } from "express";

import type { ManualRatesController } from "@/controllers/ManualRatesController";
import { validateBody, validateParams, validateQuery } from "@/middleware/validation";
import {
  createManualRateBodySchema,
  manualRateListQuerySchema,
  updateManualRateBodySchema,
} from "@/validators/manual-rates";
import { uuidParamsSchema } from "@/validators/common";

/**
 * Manual-rate endpoints. Mounted at `/api/v1/manual-rates`.
 *
 * Pure route definitions — paths, validation middleware, and controller
 * bindings only. The controller is injected by the composition root
 * (`routes/index.ts`) so no instance is ever created here.
 */
export function manualRatesRouter(controller: ManualRatesController): Router {
  const router = Router();

  router.get("/", validateQuery(manualRateListQuerySchema), controller.getManualRates);
  router.post("/", validateBody(createManualRateBodySchema), controller.createManualRate);
  router.put(
    "/:id",
    validateParams(uuidParamsSchema),
    validateBody(updateManualRateBodySchema),
    controller.updateManualRate,
  );
  router.delete("/:id", validateParams(uuidParamsSchema), controller.deleteManualRate);

  return router;
}
