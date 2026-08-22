import type { NextFunction, Request, RequestHandler, Response } from "express";

import { verifyApiKey } from "@/lib/api-keys";
import { AuthenticationError, AuthorizationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { ApiKeysRepository } from "@/repositories/ApiKeysRepository";
import type { ApiPlansRepository } from "@/repositories/ApiPlansRepository";
import type { CustomersRepository } from "@/repositories/CustomersRepository";
import type { SubscriptionsRepository } from "@/repositories/SubscriptionsRepository";
import type { ApiKeyRow } from "@/types/database";
import { nowIso } from "@/utils/date";
import { asyncHandler } from "./async-handler";

/**
 * Commercial API authentication (Phase 4).
 *
 * `Authorization: Bearer eeh_live_...` is the credential for the `/public/*`
 * surface — customer JWTs are deliberately NOT accepted here, and API keys
 * are NOT accepted on the customer self-service surface. The middleware:
 *
 *   1. extracts + shape-validates the Bearer token,
 *   2. narrows candidate keys by the public prefix,
 *   3. verifies the SHA-256 digest with a constant-time comparison,
 *   4. rejects revoked and expired keys,
 *   5. resolves the owning customer and their ACTIVE subscription,
 *   6. checks the billing period actually covers "now",
 *   7. resolves the plan (must exist and be active),
 *   8. attaches the typed context to `req.commercialApi`.
 *
 * Status mapping: anything wrong with the KEY itself is 401 (the credential
 * is missing/invalid); a valid key whose subscription/plan cannot serve
 * traffic is 403. Failures never touch usage counters or last_used_at.
 */

/** Exact anatomy of a generated key: `eeh_live_` + 43 base64url chars. */
const FULL_KEY_PATTERN = /^eeh_live_[A-Za-z0-9_-]{43}$/;

/** Prefix length used for lookup: scheme + 8 secret chars (see lib/api-keys). */
const PREFIX_LENGTH = "eeh_live_".length + 8;

/** Repositories the guard needs, injected by the composition root. */
export interface CommercialAuthDeps {
  apiKeysRepository: ApiKeysRepository;
  customersRepository: CustomersRepository;
  subscriptionsRepository: SubscriptionsRepository;
  apiPlansRepository: ApiPlansRepository;
}

/** Builds the commercial authentication guard bound to shared repositories. */
export function createCommercialApiAuth(deps: CommercialAuthDeps): RequestHandler {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const header = req.headers.authorization;
    const token =
      header !== undefined && header.startsWith("Bearer ")
        ? header.slice("Bearer ".length).trim()
        : undefined;
    if (!token) throw new AuthenticationError("Missing or invalid API key.");

    if (!FULL_KEY_PATTERN.test(token)) {
      // Malformed credentials get the SAME message as unknown ones so the
      // endpoint cannot be probed for key anatomy.
      throw new AuthenticationError("Missing or invalid API key.");
    }

    const candidates = await deps.apiKeysRepository.findAllByPrefix(token.slice(0, PREFIX_LENGTH));
    const apiKey: ApiKeyRow | undefined = candidates.find((row) =>
      verifyApiKey(token, row.key_hash),
    );
    if (!apiKey) throw new AuthenticationError("Missing or invalid API key.");

    if (apiKey.revoked_at !== null) {
      throw new AuthenticationError("API key has been revoked.");
    }
    if (apiKey.expires_at !== null && apiKey.expires_at <= nowIso()) {
      throw new AuthenticationError("API key has expired.");
    }

    const customer = await deps.customersRepository.findById(apiKey.customer_id);
    if (!customer) throw new AuthenticationError("Missing or invalid API key.");

    const subscription = await deps.subscriptionsRepository.findLatestActiveByCustomer(customer.id);
    if (!subscription) {
      throw new AuthorizationError(
        "No active subscription. Purchase a plan to use the commercial API.",
      );
    }

    const periodStart = subscription.current_period_start;
    const periodEnd = subscription.current_period_end;
    const now = nowIso();
    if (!periodStart || !periodEnd || now < periodStart || now >= periodEnd) {
      // Never silently reactivates or extends anything here — payment
      // approval is the ONLY path back to an active period (Phase 3).
      throw new AuthorizationError("Your subscription period has expired. Renew to continue.");
    }

    const plan = await deps.apiPlansRepository.findById(subscription.plan_id);
    if (!plan || !plan.is_active) {
      logger.warn("Commercial request blocked: subscription plan unavailable", {
        planId: subscription.plan_id,
      });
      throw new AuthorizationError("Your plan is currently unavailable. Contact support.");
    }

    req.commercialApi = {
      apiKeyId: apiKey.id,
      customerId: customer.id,
      subscriptionId: subscription.id,
      planId: plan.id,
      planSlug: plan.slug,
      requestsPerMinute: plan.requests_per_minute,
      monthlyRequestLimit: plan.monthly_request_limit,
      currentPeriodStart: periodStart,
    };
    next();
  });
}
