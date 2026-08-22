import type { NextFunction, Request, RequestHandler, Response } from "express";

import { asyncHandler } from "./async-handler";
import type { ApiUsageRepository } from "@/repositories/ApiUsageRepository";
import type { ApiKeysRepository } from "@/repositories/ApiKeysRepository";
import { logger } from "@/lib/logger";

/**
 * Monthly-quota enforcement + usage metering for the commercial API
 * (Phase 4, Part E/F).
 *
 * Two cooperating middlewares:
 *
 *  - `createCommercialQuotaGuard` runs BEFORE the handler: it reads the
 *    aggregated `api_usage` row for (key, current billing period) and rejects
 *    with a DISTINCT 429 ("monthly quota") once `plan.monthly_request_limit`
 *    is reached — clearly different from the per-minute limit.
 *
 *  - `createCommercialMeter` runs AFTER a successful response: only requests
 *    that finished with a 2xx/3xx status are counted (failed auth and client
 *    errors are never billed) via the atomic `increment_api_usage` RPC.
 *    Metering is fire-and-forget: an increment failure is logged but must not
 *    corrupt the response the customer already received.
 *
 *  The meter also stamps `api_keys.last_used_at`, throttled to one write per
 *  key per LAST_USED_THROTTLE_MS so high-frequency pollers do not generate a
 *  database write per request. Documented behavior: last_used_at may lag real
 *  activity by up to the throttle window.
 */

const LAST_USED_THROTTLE_MS = 60_000;

/** apiKeyId -> last time we wrote last_used_at. In-process, best effort. */
const lastUsedWrites = new Map<string, number>();

/** Test hook: forget throttle state between tests. */
export function resetLastUsedThrottle(): void {
  lastUsedWrites.clear();
}

/** Quota guard factory; must run AFTER `createCommercialApiAuth`. */
export function createCommercialQuotaGuard(apiUsageRepository: ApiUsageRepository): RequestHandler {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const context = req.commercialApi;
    if (!context) throw new Error("commercial quota guard ran without auth context");

    const usage = await apiUsageRepository.findByKeyAndPeriod(
      context.apiKeyId,
      context.currentPeriodStart,
    );
    const used = usage?.request_count ?? 0;
    const remaining = Math.max(0, context.monthlyRequestLimit - used);

    // Quota headers mirror the RPM ones but describe the MONTHLY window;
    // Retry-After is intentionally omitted (hours/days, not seconds).
    res.setHeader("X-Quota-Limit", String(context.monthlyRequestLimit));
    res.setHeader("X-Quota-Remaining", String(remaining));
    res.setHeader("X-Quota-Reset", context.currentPeriodStart);

    if (used >= context.monthlyRequestLimit) {
      res.status(429).json({
        success: false,
        message: `Monthly quota exceeded: your plan includes ${context.monthlyRequestLimit} requests per billing period. Upgrade your plan or wait for renewal.`,
        data: null,
      });
      return;
    }
    next();
  });
}

/** Meter factory; must be the LAST commercial middleware before routes. */
export function createCommercialMeter(
  apiUsageRepository: ApiUsageRepository,
  apiKeysRepository: ApiKeysRepository,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const context = req.commercialApi;
    if (!context) {
      next(new Error("commercial meter ran without auth context"));
      return;
    }

    res.on("finish", () => {
      // Only successful commercial responses are counted as usage (Part E).
      if (res.statusCode >= 400) return;

      void apiUsageRepository
        .increment(context.apiKeyId, context.subscriptionId, context.currentPeriodStart)
        .catch((error: unknown) => {
          logger.error("Failed to record commercial API usage", {
            apiKeyId: context.apiKeyId,
            error: error instanceof Error ? error.message : String(error),
          });
        });

      const now = Date.now();
      const lastWrite = lastUsedWrites.get(context.apiKeyId) ?? 0;
      if (now - lastWrite >= LAST_USED_THROTTLE_MS) {
        lastUsedWrites.set(context.apiKeyId, now);
        void apiKeysRepository
          .touchLastUsed(context.apiKeyId, new Date().toISOString())
          .catch((error: unknown) => {
            logger.warn("Failed to update api_keys.last_used_at", {
              apiKeyId: context.apiKeyId,
              error: error instanceof Error ? error.message : String(error),
            });
          });
      }
    });
    next();
  };
}
