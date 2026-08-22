import { Router } from "express";

import type { CustomerApiKeysController } from "@/controllers/CustomerApiKeysController";
import type { CustomerSubscriptionController } from "@/controllers/CustomerSubscriptionController";
import type { CustomerUsageController } from "@/controllers/CustomerUsageController";
import type { PaymentController } from "@/controllers/PaymentController";
import { requireSingleUpload } from "@/middleware/upload";
import { validateBody, validateParams } from "@/middleware/validation";
import { createSubscriptionBodySchema } from "@/validators/customer-subscription";
import { createPaymentBodySchema, paymentIdParamsSchema } from "@/validators/customer-payment";
import { apiKeyIdParamsSchema, createApiKeyBodySchema } from "@/validators/customer-api-keys";

/**
 * Customer self-service endpoints. Mounted at `/api/v1/customer` behind
 * `requireAuth` + `requireRole("customer")` (applied at the mount point in
 * the composition root — the same pattern as the admin surface).
 *
 * Pure route definitions — paths, validation middleware, and controller
 * bindings only.
 */
export function customerApiKeysRouter(controller: CustomerApiKeysController): Router {
  const router = Router();

  router.post("/api-keys", validateBody(createApiKeyBodySchema), controller.create);
  router.get("/api-keys", controller.list);
  router.delete("/api-keys/:id", validateParams(apiKeyIdParamsSchema), controller.revoke);

  return router;
}

/** Plan catalog + subscription selection (Phase 2C). */
export function customerSubscriptionRouter(controller: CustomerSubscriptionController): Router {
  const router = Router();

  router.get("/plans", controller.getPlans);
  router.get("/subscription", controller.getSubscription);
  router.post(
    "/subscription",
    validateBody(createSubscriptionBodySchema),
    controller.createSubscription,
  );

  return router;
}

/** Manual bank-transfer payments (Phase 3). */
export function customerPaymentRouter(controller: PaymentController): Router {
  const router = Router();

  router.get("/payment-methods", controller.getPaymentMethods);
  router.post("/payments", validateBody(createPaymentBodySchema), controller.submitPayment);
  router.get("/payments", controller.listPayments);
  router.post(
    "/payments/:id/receipt",
    validateParams(paymentIdParamsSchema),
    requireSingleUpload("receipt"),
    controller.uploadReceipt,
  );

  return router;
}

/** Customer usage analytics (Phase 4, Part K). */
export function customerUsageRouter(controller: CustomerUsageController): Router {
  const router = Router();

  router.get("/usage", controller.getUsage);
  router.get("/usage/:id", validateParams(apiKeyIdParamsSchema), controller.getKeyUsage);

  return router;
}
