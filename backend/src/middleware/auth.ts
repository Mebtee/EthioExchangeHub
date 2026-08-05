import type { NextFunction, Request, RequestHandler, Response } from "express";

import { toAuthenticatedUser } from "@/lib/auth-user";
import { AuthenticationError, AuthorizationError } from "@/lib/errors";
import { verifyToken } from "@/lib/tokens";
import type { UsersRepository } from "@/repositories/UsersRepository";
import { env } from "@/utils/validate-env";
import { asyncHandler } from "./async-handler";

/**
 * Authentication + authorization middleware (A2).
 *
 * `createRequireAuth` is a factory (the composition root injects the shared
 * `UsersRepository`): it requires a valid `Authorization: Bearer <access>`
 * header, verifies the JWT signature and discriminator, loads the user row
 * (so deleted/disabled accounts lose access immediately, no token wait), and
 * attaches the user to `req.user`. Every failure mode is a 401 with the
 * standard envelope.
 *
 * `requireRole` guards handler groups: the authenticated role must appear in
 * the allowed list, otherwise 403. Role checks run AFTER requireAuth so
 * `req.user` is always populated.
 */

/** Builds the authentication guard bound to the shared users repository. */
export function createRequireAuth(usersRepository: UsersRepository): RequestHandler {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const header = req.headers.authorization;
    const token =
      header !== undefined && header.startsWith("Bearer ")
        ? header.slice("Bearer ".length)
        : undefined;
    if (!token) throw new AuthenticationError("Authentication required.");

    const { sub } = verifyToken(token, env.JWT_SECRET, "access");
    const user = await usersRepository.findById(sub);
    if (!user) throw new AuthenticationError("Session user no longer exists.");

    req.user = toAuthenticatedUser(user);
    next();
  });
}

/** Requires the authenticated user's role to be one of the given roles. */
export function requireRole(...roles: string[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.user !== undefined && roles.includes(req.user.role)) {
      next();
      return;
    }
    next(new AuthorizationError());
  };
}
