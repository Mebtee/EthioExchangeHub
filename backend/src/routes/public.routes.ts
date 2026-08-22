import { Router } from "express";

import type { CommercialApiController } from "@/controllers/CommercialApiController";
import { createCommercialApiAuth, type CommercialAuthDeps } from "@/middleware/commercial-auth";
import { createCommercialRateLimiter } from "@/middleware/commercial-rate-limit";
import {
  createCommercialMeter,
  createCommercialQuotaGuard,
} from "@/middleware/commercial-metering";
import type { ApiKeysRepository } from "@/repositories/ApiKeysRepository";
import type { ApiUsageRepository } from "@/repositories/ApiUsageRepository";
import {
  bankAndCurrencyParamsSchema,
  bankCodeParamsSchema,
  dateRangeQuerySchema,
} from "@/validators/common";
import { validateParams, validateQuery } from "@/middleware/validation";

/**
 * PUBLIC COMMERCIAL API (Phase 4).
 *
 * Mounted at `/api/v1/public`. The middleware order IS the product:
 *
 *   1. `createCommercialApiAuth`  — API key → customer → active subscription → plan
 *   2. `createCommercialRateLimiter` — plan RPM (429 "requests per minute")
 *   3. `createCommercialQuotaGuard`  — plan monthly quota (429 "monthly quota")
 *   4. `createCommercialMeter`       — counts SUCCESSFUL responses only
 *
 * Customer JWTs are not accepted here; API keys are not accepted elsewhere.
 */
export interface CommercialRouterDeps extends CommercialAuthDeps {
  apiUsageRepository: ApiUsageRepository;
  controller: CommercialApiController;
}

export function commercialPublicRouter(deps: CommercialRouterDeps): Router {
  const router = Router();

  router.use(
    createCommercialApiAuth(deps),
    createCommercialRateLimiter(),
    createCommercialQuotaGuard(deps.apiUsageRepository),
    createCommercialMeter(deps.apiUsageRepository, deps.apiKeysRepository as ApiKeysRepository),
  );

  router.get("/rates/latest", validateQuery(dateRangeQuerySchema), deps.controller.getLatestRates);
  router.get(
    "/rates/latest/:bankCode",
    validateParams(bankCodeParamsSchema),
    validateQuery(dateRangeQuerySchema),
    deps.controller.getLatestRatesByBank,
  );
  router.get(
    "/rates/latest/:bankCode/:currencyCode",
    validateParams(bankAndCurrencyParamsSchema),
    deps.controller.getLatestRateByBankAndCurrency,
  );
  router.get(
    "/rates/history/:bankCode/:currencyCode",
    validateParams(bankAndCurrencyParamsSchema),
    validateQuery(dateRangeQuerySchema),
    deps.controller.getHistoricalRates,
  );
  router.get("/banks", deps.controller.getBanks);
  router.get(
    "/banks/:bankCode",
    validateParams(bankCodeParamsSchema),
    deps.controller.getBankByCode,
  );

  return router;
}
