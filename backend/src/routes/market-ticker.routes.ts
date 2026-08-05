import { Router } from "express";

import type { ExchangeRatesController } from "@/controllers/ExchangeRatesController";
import { validateQuery } from "@/middleware/validation";
import { marketTickerQuerySchema } from "@/validators/exchange-rates";

/**
 * Market-ticker endpoint. Mounted at `/api/v1/market-ticker` (matches the
 * frontend's `fetchMarketTicker` contract). Pure route definition — the
 * controller is injected by the composition root.
 */
export function marketTickerRouter(controller: ExchangeRatesController): Router {
  const router = Router();

  router.get("/", validateQuery(marketTickerQuerySchema), controller.getMarketTicker);

  return router;
}
