import type { Request, Response } from "express";

import { asyncHandler } from "@/middleware/async-handler";
import type {
  ManualRateFilter,
  ManualRateInput,
  ManualRatesService,
  UpdateManualRateInput,
} from "@/services/ManualRatesService";
import { successResponse } from "@/utils/api-response";

/**
 * HTTP adapter for manual-rate endpoints. Reads params/query/body, delegates
 * to the service, and returns the standard envelope. No business logic here.
 */
export class ManualRatesController {
  constructor(private readonly manualRatesService: ManualRatesService) {}

  /** Lists manual rates, optionally filtered. */
  getManualRates = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const rates = await this.manualRatesService.listManualRates(
      ManualRatesController.readFilter(req.query),
    );
    successResponse(res, rates, "Manual rates retrieved.");
  });

  /** Creates a manual rate (201). */
  createManualRate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const rate = await this.manualRatesService.createManualRate(req.body as ManualRateInput);
    successResponse(res, rate, "Manual rate created.", 201);
  });

  /** Updates a manual rate (200). */
  updateManualRate = asyncHandler(
    async (req: Request<{ id: string }>, res: Response): Promise<void> => {
      const rate = await this.manualRatesService.updateManualRate(
        req.params.id,
        req.body as UpdateManualRateInput,
      );
      successResponse(res, rate, "Manual rate updated.");
    },
  );

  /** Deletes a manual rate (200). */
  deleteManualRate = asyncHandler(
    async (req: Request<{ id: string }>, res: Response): Promise<void> => {
      await this.manualRatesService.deleteManualRate(req.params.id);
      successResponse(res, null, "Manual rate deleted.");
    },
  );

  /** Reads optional filter query params into a manual-rate filter (no validation). */
  private static readFilter(query: Request["query"]): ManualRateFilter {
    const filter: ManualRateFilter = {};
    if (typeof query.bankCode === "string") filter.bankCode = query.bankCode;
    if (typeof query.currencyCode === "string") filter.currencyCode = query.currencyCode;
    if (typeof query.rateDate === "string") filter.rateDate = query.rateDate;
    return filter;
  }
}
