import type { Request, Response } from "express";

import { asyncHandler } from "@/middleware/async-handler";
import type { BanksService } from "@/services/BanksService";
import type { ExchangeRatesService } from "@/services/ExchangeRatesService";
import { successResponse } from "@/utils/api-response";

/**
 * HTTP adapter for the PUBLIC COMMERCIAL API (Phase 4).
 *
 * Mounted at `/api/v1/public` behind API-key authentication + plan limits.
 * The handlers deliberately mirror `ExchangeRatesController`/`BanksController`
 * and reuse the SAME services — the commercial surface is a gated view over
 * exactly the data the free website serves, with identical response shapes so
 * customers can migrate between tiers without re-parsing anything.
 */
export class CommercialApiController {
  constructor(
    private readonly exchangeRatesService: ExchangeRatesService,
    private readonly banksService: BanksService,
  ) {}

  /** GET /public/rates/latest — resolved snapshot across all banks. */
  getLatestRates = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const rates = await this.exchangeRatesService.getLatestRates(readDateRange(req.query));
    successResponse(res, rates, "Latest exchange rates retrieved.");
  });

  /** GET /public/rates/latest/:bankCode — snapshot for one bank. */
  getLatestRatesByBank = asyncHandler(
    async (req: Request<{ bankCode: string }>, res: Response): Promise<void> => {
      const rates = await this.exchangeRatesService.getLatestRatesByBank(
        req.params.bankCode,
        readDateRange(req.query),
      );
      successResponse(res, rates, "Latest rates retrieved.");
    },
  );

  /** GET /public/rates/latest/:bankCode/:currencyCode — single newest rate. */
  getLatestRateByBankAndCurrency = asyncHandler(
    async (
      req: Request<{ bankCode: string; currencyCode: string }>,
      res: Response,
    ): Promise<void> => {
      const rate = await this.exchangeRatesService.getLatestRateByBankAndCurrency(
        req.params.bankCode,
        req.params.currencyCode,
      );
      if (!rate) {
        successResponse(res, null, "No rate published for this bank and currency yet.");
        return;
      }
      successResponse(res, rate, "Latest rate retrieved.");
    },
  );

  /** GET /public/rates/history/:bankCode/:currencyCode — dated history, oldest first. */
  getHistoricalRates = asyncHandler(
    async (
      req: Request<{ bankCode: string; currencyCode: string }>,
      res: Response,
    ): Promise<void> => {
      const rates = await this.exchangeRatesService.getHistoricalRates(
        req.params.bankCode,
        req.params.currencyCode,
        readDateRange(req.query),
      );
      successResponse(res, rates, "Historical rates retrieved.");
    },
  );

  /** GET /public/banks — ACTIVE banks only (commercial directory). */
  getBanks = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const banks = await this.banksService.listActiveBanks();
    successResponse(res, banks, "Banks retrieved.");
  });

  /** GET /public/banks/:bankCode — one ACTIVE bank by code (inactive = 404). */
  getBankByCode = asyncHandler(
    async (req: Request<{ bankCode: string }>, res: Response): Promise<void> => {
      const bank = await this.banksService.findActiveByBankCode(req.params.bankCode);
      successResponse(res, bank, "Bank retrieved.");
    },
  );
}

/** Reads optional `from`/`to` query params into a date range (validated in service). */
function readDateRange(query: Request["query"]): { from?: string; to?: string } {
  const range: { from?: string; to?: string } = {};
  if (typeof query.from === "string") range.from = query.from;
  if (typeof query.to === "string") range.to = query.to;
  return range;
}
