import type { Request, Response } from "express";

import { asyncHandler } from "@/middleware/async-handler";
import type { CustomerUsageService } from "@/services/CustomerUsageService";
import { successResponse } from "@/utils/api-response";

/**
 * HTTP adapter for customer usage endpoints (Phase 4, Part K). Mounted under
 * `/api/v1/customer` behind `requireAuth` + `requireRole("customer")`.
 * Identity always comes from the JWT subject — never from client input.
 */
export class CustomerUsageController {
  constructor(private readonly customerUsageService: CustomerUsageService) {}

  /** GET /customer/usage — plan limits + period consumption across all keys. */
  getUsage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const usage = await this.customerUsageService.getUsage(req.user!.id);
    successResponse(res, usage, "API usage retrieved.");
  });

  /** GET /customer/usage/:apiKeyId — consumption for one owned key. */
  getKeyUsage = asyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const usage = await this.customerUsageService.getKeyUsage(req.user!.id, req.params.id);
    successResponse(res, usage, "API key usage retrieved.");
  });
}
