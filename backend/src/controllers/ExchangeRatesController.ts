import type { Request, Response } from "express";

import { asyncHandler } from "@/middleware/async-handler";
import type { ExchangeRatesService, RateDateRange } from "@/services/ExchangeRatesService";
import { successResponse } from "@/utils/api-response";

/**
 * HTTP adapter for exchange-rate endpoints. Reads params/query, delegates to
 * the service, and returns the standard envelope. No business logic here.
 */
export class ExchangeRatesController {
  constructor(private readonly exchangeRatesService: ExchangeRatesService) {}

  /** Returns the resolved latest snapshot, optionally date-filtered. */
  getLatestRates = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const rates = await this.exchangeRatesService.getLatestRates(
      ExchangeRatesController.readDateRange(req.query),
    );
    successResponse(res, rates, "Latest exchange rates retrieved.");
  });

  /** Returns the resolved latest rates for one bank. */
  getLatestRatesByBank = asyncHandler(
    async (req: Request<{ bankCode: string }>, res: Response): Promise<void> => {
      const rates = await this.exchangeRatesService.getLatestRatesByBank(
        req.params.bankCode,
        ExchangeRatesController.readDateRange(req.query),
      );
      successResponse(res, rates, "Latest rates retrieved.");
    },
  );

  /** Returns the latest rate for a single bank + currency. */
  getLatestRateByBankAndCurrency = asyncHandler(
    async (
      req: Request<{ bankCode: string; currencyCode: string }>,
      res: Response,
    ): Promise<void> => {
      const rate = await this.exchangeRatesService.getLatestRateByBankAndCurrency(
        req.params.bankCode,
        req.params.currencyCode,
      );
      successResponse(res, rate, "Latest rate retrieved.");
    },
  );

  /** Returns the full dated history for a bank + currency, optionally filtered. */
  getHistoricalRates = asyncHandler(
    async (
      req: Request<{ bankCode: string; currencyCode: string }>,
      res: Response,
    ): Promise<void> => {
      const rates = await this.exchangeRatesService.getHistoricalRates(
        req.params.bankCode,
        req.params.currencyCode,
        ExchangeRatesController.readDateRange(req.query),
      );
      successResponse(res, rates, "Historical rates retrieved.");
    },
  );

  /** Returns the oldest and newest rate_date across all published rates. */
  getDateRange = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const range = await this.exchangeRatesService.getDateRange();
    successResponse(res, range, "Rate date range retrieved.");
  });

  /** Reads optional `from`/`to` query params into a date range (no validation). */
  private static readDateRange(query: Request["query"]): RateDateRange {
    const range: RateDateRange = {};
    if (typeof query.from === "string") range.from = query.from;
    if (typeof query.to === "string") range.to = query.to;
    return range;
  }
}
