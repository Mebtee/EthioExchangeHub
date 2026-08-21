import { Router } from "express";

import type { AdminController } from "@/controllers/AdminController";
import type { AdminPaymentController } from "@/controllers/AdminPaymentController";
import { validateBody, validateParams, validateQuery } from "@/middleware/validation";
import {
  rateTrendQuerySchema,
  updateAdminProfileBodySchema,
  updateAdminSettingsBodySchema,
} from "@/validators/admin";
import {
  bankConfigIdParamsSchema,
  createBankConfigBodySchema,
  listPaymentsQuerySchema,
  paymentIdParamsSchema,
  reviewPaymentBodySchema,
  updateBankConfigBodySchema,
} from "@/validators/customer-payment";

/**
 * Admin endpoints (profile, settings, dashboard). Mounted at `/api/v1/admin`.
 *
 * Pure route definitions — paths, validation middleware, and controller
 * bindings only. The controller is injected by the composition root
 * (`routes/index.ts`) so no instance is ever created here.
 */
export function adminRouter(controller: AdminController): Router {
  const router = Router();

  router.get("/profile", controller.getProfile);
  router.put("/profile", validateBody(updateAdminProfileBodySchema), controller.updateProfile);

  router.get("/settings", controller.getSettings);
  router.put("/settings", validateBody(updateAdminSettingsBodySchema), controller.updateSettings);

  router.get("/dashboard/rate-trend", validateQuery(rateTrendQuerySchema), controller.getRateTrend);

  return router;
}

/** Payment review + bank-configuration management (Phase 3). */
export function adminPaymentRouter(controller: AdminPaymentController): Router {
  const router = Router();

  // Payment review workflow.
  router.get("/payments", validateQuery(listPaymentsQuerySchema), controller.listPayments);
  router.get("/payments/:id", validateParams(paymentIdParamsSchema), controller.getPayment);
  router.post(
    "/payments/:id/review",
    validateParams(paymentIdParamsSchema),
    validateBody(reviewPaymentBodySchema),
    controller.reviewPayment,
  );
  router.get(
    "/payments/:id/receipt",
    validateParams(paymentIdParamsSchema),
    controller.getReceiptUrl,
  );

  // Bank account configuration (customers see ACTIVE accounts only).
  router.get("/payment-methods", controller.listBankAccounts);
  router.post(
    "/payment-methods",
    validateBody(createBankConfigBodySchema),
    controller.createBankAccount,
  );
  router.patch(
    "/payment-methods/:id",
    validateParams(bankConfigIdParamsSchema),
    validateBody(updateBankConfigBodySchema),
    controller.updateBankAccount,
  );

  return router;
}
