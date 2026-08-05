import { Router } from "express";

import type { AdminController } from "@/controllers/AdminController";
import { validateBody, validateQuery } from "@/middleware/validation";
import {
  rateTrendQuerySchema,
  updateAdminProfileBodySchema,
  updateAdminSettingsBodySchema,
} from "@/validators/admin";

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
