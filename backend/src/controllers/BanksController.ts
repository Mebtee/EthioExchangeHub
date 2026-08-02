import type { Request, Response } from "express";

import { asyncHandler } from "@/middleware/async-handler";
import type { BanksFilter, BanksService } from "@/services/BanksService";
import { successResponse } from "@/utils/api-response";

/**
 * HTTP adapter for bank endpoints. Reads params/query, delegates to the
 * service, and returns the standard envelope. No business logic here.
 */
export class BanksController {
  constructor(private readonly banksService: BanksService) {}

  /** Lists banks, optionally filtered (activeOnly / bankType). */
  getBanks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filter: BanksFilter = {};
    if (typeof req.query.activeOnly === "string") {
      filter.activeOnly = req.query.activeOnly === "true";
    }
    if (typeof req.query.bankType === "string") {
      filter.bankType = req.query.bankType;
    }
    const banks = await this.banksService.listBanks(filter);
    successResponse(res, banks, "Banks retrieved.");
  });

  /** Lists only active banks. */
  getActiveBanks = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const banks = await this.banksService.listActiveBanks();
    successResponse(res, banks, "Active banks retrieved.");
  });

  /** Returns a single bank by its code. */
  getBankByCode = asyncHandler(
    async (req: Request<{ bankCode: string }>, res: Response): Promise<void> => {
      const bank = await this.banksService.findByBankCode(req.params.bankCode);
      successResponse(res, bank, "Bank retrieved.");
    },
  );
}
