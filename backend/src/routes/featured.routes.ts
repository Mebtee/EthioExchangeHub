import { Router } from "express";

import type { FeaturedContentController } from "@/controllers/FeaturedContentController";
import { validateBody, validateParams } from "@/middleware/validation";
import { uuidParamsSchema } from "@/validators/common";
import {
  createFeaturedContentBodySchema,
  recordFeaturedClickBodySchema,
  updateFeaturedContentBodySchema,
} from "@/validators/featured";

/**
 * Featured-content endpoints.
 *
 * Public router mounted at `/api/v1/featured` (no auth — the homepage hero).
 * Admin router mounted at `/api/v1/admin/featured` behind `requireAuth` +
 * `requireAdmin` in the composition root. Pure route definitions — paths,
 * validation middleware, and controller bindings only.
 */
export function featuredRouter(controller: FeaturedContentController): Router {
  const router = Router();

  // The single currently-eligible campaign (homepage hero).
  router.get("/", controller.getActive);
  // Records a click when a visitor activates the card.
  router.post(
    "/:id/click",
    validateParams(uuidParamsSchema),
    validateBody(recordFeaturedClickBodySchema),
    controller.recordClick,
  );

  return router;
}

export function featuredAdminRouter(controller: FeaturedContentController): Router {
  const router = Router();

  router.get("/", controller.list);
  router.post("/", validateBody(createFeaturedContentBodySchema), controller.create);
  router.get("/:id", validateParams(uuidParamsSchema), controller.getOne);
  router.patch(
    "/:id",
    validateParams(uuidParamsSchema),
    validateBody(updateFeaturedContentBodySchema),
    controller.update,
  );
  router.delete("/:id", validateParams(uuidParamsSchema), controller.delete);

  return router;
}
