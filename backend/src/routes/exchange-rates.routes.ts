import { Router } from "express";

import type { ExchangeRatesController } from "@/controllers/ExchangeRatesController";
import { validateParams, validateQuery } from "@/middleware/validation";
import {
  historyParamsSchema,
  latestByBankParamsSchema,
  latestRatesQuerySchema,
  ratePairParamsSchema,
} from "@/validators/exchange-rates";

/**
 * Exchange-rate endpoints. Mounted at `/api/v1/rates`.
 *
 * Pure route definitions — paths, validation middleware, and controller
 * bindings only. The controller is injected by the composition root
 * (`routes/index.ts`) so no instance is ever created here.
 */
export function exchangeRatesRouter(controller: ExchangeRatesController): Router {
  const router = Router();

  router.get("/date-range", controller.getDateRange);
  router.get("/latest", validateQuery(latestRatesQuerySchema), controller.getLatestRates);
  router.get(
    "/latest/:bankCode",
    validateParams(latestByBankParamsSchema),
    validateQuery(latestRatesQuerySchema),
    controller.getLatestRatesByBank,
  );
  router.get(
    "/latest/:bankCode/:currencyCode",
    validateParams(ratePairParamsSchema),
    controller.getLatestRateByBankAndCurrency,
  );
  // Params match the approved controller contract (`getHistoricalRates` reads
  // `req.params.bankCode`/`req.params.currencyCode`); optional `?from`/`?to`
  // query filtering is handled by the controller's `readDateRange`.
  router.get(
    "/history/:bankCode/:currencyCode",
    validateParams(historyParamsSchema),
    validateQuery(latestRatesQuerySchema),
    controller.getHistoricalRates,
  );

  return router;
}
