import { Router } from "express";

import type { CustomerApiKeysController } from "@/controllers/CustomerApiKeysController";
import { validateBody, validateParams } from "@/middleware/validation";
import { apiKeyIdParamsSchema, createApiKeyBodySchema } from "@/validators/customer-api-keys";

/**
 * Customer API-key endpoints. Mounted at `/api/v1/customer` behind
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
