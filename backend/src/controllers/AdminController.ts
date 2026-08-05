import type { Request, Response } from "express";

import { asyncHandler } from "@/middleware/async-handler";
import type { ExchangeRatesService } from "@/services/ExchangeRatesService";
import type {
  AdminProfileInput,
  AdminSettingsInput,
  SettingsService,
} from "@/services/SettingsService";
import { successResponse } from "@/utils/api-response";

/**
 * HTTP adapter for admin endpoints (profile, settings, dashboard). Reads
 * params/query/body, delegates to the services, and returns the standard
 * envelope. No business logic here.
 *
 * Profile/settings delegate to the `SettingsService`; the dashboard rate
 * trend reuses the existing `ExchangeRatesService` — no admin repository
 * exists by design.
 */
export class AdminController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

  /** Returns the configured administrator profile. */
  getProfile = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const profile = await this.settingsService.getProfile();
    successResponse(res, profile, "Admin profile retrieved.");
  });

  /** Updates the editable profile fields and returns the stored profile. */
  updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const profile = await this.settingsService.updateProfile(req.body as AdminProfileInput);
    successResponse(res, profile, "Admin profile updated.");
  });

  /** Returns the persisted platform settings (merged with configured defaults). */
  getSettings = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const settings = await this.settingsService.getSettings();
    successResponse(res, settings, "Admin settings retrieved.");
  });

  /** Persists the provided settings fields and returns the stored settings. */
  updateSettings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const settings = await this.settingsService.updateSettings(req.body as AdminSettingsInput);
    successResponse(res, settings, "Admin settings updated.");
  });

  /** Returns the cash rate trend aggregated by rate date (newest `days` points). */
  getRateTrend = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const trend = await this.exchangeRatesService.getRateTrend(
      AdminController.readDays(req.query),
      AdminController.readCurrency(req.query),
    );
    successResponse(res, trend, "Rate trend retrieved.");
  });

  /**
   * Reads the optional `days` query param into a positive integer. Only
   * coercion — non-numeric values are omitted (validation happens in the
   * validator layer, which guarantees a canonical positive integer string).
   */
  private static readDays(query: Request["query"]): number | undefined {
    if (typeof query.days === "string") {
      const days = Number(query.days);
      if (Number.isInteger(days) && days > 0) return days;
    }
    return undefined;
  }

  /** Reads the optional `currency` query param (validated upstream to `^[A-Z]{3}$`). */
  private static readCurrency(query: Request["query"]): string | undefined {
    return typeof query.currency === "string" ? query.currency : undefined;
  }
}
