import type { Request, Response } from "express";

import { AuthenticationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { asyncHandler } from "@/middleware/async-handler";
import type { AuthService } from "@/services/AuthService";
import { successResponse } from "@/utils/api-response";
import { env } from "@/utils/validate-env";

/**
 * HTTP adapter for auth endpoints. Reads validated body fields, delegates to
 * the service, and returns the standard envelope. No business logic here.
 *
 * The forgot-password response is deliberately constant from the client's
 * perspective (`{ sent: true }` — an unknown email answers identically to a
 * known one, so the endpoint cannot be used to enumerate accounts). The
 * password-reset token is NEVER returned in the HTTP response; in development
 * it is logged server-side only for debugging.
 */
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Exchanges credentials for tokens + user (provisions the bootstrap admin). */
  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body as { email: string; password: string };
    const session = await this.authService.login(email, password);
    successResponse(res, session, "Login successful.");
  });

  /** Creates a customer account (Phase 2A). Returns the public user shape — never tokens or hashes. */
  register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password, company_name, phone } = req.body as {
      email: string;
      password: string;
      company_name?: string;
      phone?: string;
    };
    const user = await this.authService.register({
      email,
      password,
      companyName: company_name,
      phone,
    });
    successResponse(res, user, "Registration successful.", 201);
  });

  /** Exchanges a refresh token for a fresh token pair. */
  refresh = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body as { refreshToken: string };
    const tokens = await this.authService.refresh(refreshToken);
    successResponse(res, tokens, "Tokens refreshed.");
  });

  /** Stateless logout — the client discards its tokens; nothing to revoke server-side. */
  logout = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    successResponse(res, null, "Logged out.");
  });

  /** Resolves the authenticated user (guarded by `requireAuth`). */
  me = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // `requireAuth` guarantees `req.user`; the check is a misconfiguration
    // tripwire so an unguarded mount fails with 401 instead of a 500.
    const userId = req.user?.id;
    if (userId === undefined) throw new AuthenticationError("Authentication required.");
    const user = await this.authService.me(userId);
    successResponse(res, user, "Authenticated user retrieved.");
  });

  /** Issues a password-reset token without revealing whether the email exists. */
  forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body as { email: string };
    const token = await this.authService.forgotPassword(email);

    // The token is NEVER exposed in the HTTP response. In non-production
    // environments it is logged server-side only for development debugging.
    if (env.NODE_ENV !== "production" && token !== null) {
      logger.info(`[DEV] Password reset token for ${email}: ${token}`);
    }

    successResponse(res, { sent: true }, "If an account exists, a password reset has been issued.");
  });

  /** Applies the new password using the reset token. */
  resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token, password } = req.body as { token: string; password: string };
    await this.authService.resetPassword(token, password);
    successResponse(res, null, "Password updated.");
  });
}
