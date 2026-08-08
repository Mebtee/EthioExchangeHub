import { Router } from "express";

import type { ContactController } from "@/controllers/ContactController";
import { validateBody } from "@/middleware/validation";
import { createContactMessageBodySchema } from "@/validators/contact";

/**
 * Public contact endpoint. Mounted at `/api/v1/contact`.
 *
 * Pure route definition — path, validation middleware, and controller binding
 * only. The controller is injected by the composition root (`routes/index.ts`)
 * so no instance is ever created here.
 */
export function contactRouter(controller: ContactController): Router {
  const router = Router();

  router.post("/messages", validateBody(createContactMessageBodySchema), controller.submitMessage);

  return router;
}
