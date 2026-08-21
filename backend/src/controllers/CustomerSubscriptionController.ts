import type { Request, Response } from "express";

import { AuthenticationError } from "@/lib/errors";
import { asyncHandler } from "@/middleware/async-handler";
import type { CustomerSubscriptionService } from "@/services/CustomerSubscriptionService";
import { successResponse } from "@/utils/api-response";

/**
 * HTTP adapter for the customer plans/subscription endpoints. Reads validated
 * fields, delegates to the service, and returns the standard envelope. No
 * business logic here.
 */
export class CustomerSubscriptionController {
  constructor(private readonly subscriptionService: CustomerSubscriptionService) {}

  /** Lists active API plans in catalog order. */
  getPlans = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const plans = await this.subscriptionService.getPlans();
    successResponse(res, plans, "Plans retrieved.");
  });

  /** Returns the authenticated customer's latest subscription (or 404). */
  getSubscription = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = requireUserId(req);
    const subscription = await this.subscriptionService.getSubscription(userId);
    successResponse(res, subscription, "Subscription retrieved.");
  });

  /** Selects a plan (free activates immediately; paid stays pending). */
  createSubscription = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = requireUserId(req);
    const { plan_id } = req.body as { plan_id: string };
    const subscription = await this.subscriptionService.createSubscription(userId, {
      planId: plan_id,
    });
    successResponse(res, subscription, "Subscription created.", 201);
  });
}

/** `requireAuth` guarantees `req.user`; a miss means an unguarded mount. */
function requireUserId(req: Request): string {
  const userId = req.user?.id;
  if (userId === undefined) throw new AuthenticationError("Authentication required.");
  return userId;
}
