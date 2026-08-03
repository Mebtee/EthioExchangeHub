import { Router } from "express";

import type { BanksController } from "@/controllers/BanksController";
import { validateParams, validateQuery } from "@/middleware/validation";
import { bankListQuerySchema } from "@/validators/banks";
import { bankCodeParamsSchema } from "@/validators/common";

/**
 * Bank endpoints. Mounted at `/api/v1/banks`.
 *
 * Pure route definitions — paths, validation middleware, and controller
 * bindings only. The controller is injected by the composition root
 * (`routes/index.ts`) so no instance is ever created here.
 *
 * Order matters: `/active` must be declared before `/:bankCode` so the literal
 * segment wins over the param.
 */
export function banksRouter(controller: BanksController): Router {
  const router = Router();

  router.get("/", validateQuery(bankListQuerySchema), controller.getBanks);
  router.get("/active", controller.getActiveBanks);
  router.get("/:bankCode", validateParams(bankCodeParamsSchema), controller.getBankByCode);

  return router;
}
