import { Router, type RequestHandler } from "express";

import type { AuthController } from "@/controllers/AuthController";
import { validateBody } from "@/middleware/validation";
import {
  forgotPasswordBodySchema,
  loginBodySchema,
  refreshBodySchema,
  resetPasswordBodySchema,
} from "@/validators/auth";

/**
 * Auth endpoints. Mounted at `/api/v1/auth`.
 *
 * Pure route definitions — paths, validation middleware, and controller
 * bindings only. `requireAuth` is injected by the composition root (the same
 * guard used to protect admin routes), so `/me` cannot be reached without a
 * valid access token.
 */
export function authRouter(controller: AuthController, requireAuth: RequestHandler): Router {
  const router = Router();

  router.post("/login", validateBody(loginBodySchema), controller.login);
  router.post("/refresh", validateBody(refreshBodySchema), controller.refresh);
  router.post("/logout", controller.logout);
  router.get("/me", requireAuth, controller.me);
  router.post(
    "/forgot-password",
    validateBody(forgotPasswordBodySchema),
    controller.forgotPassword,
  );
  router.post("/reset-password", validateBody(resetPasswordBodySchema), controller.resetPassword);

  return router;
}
