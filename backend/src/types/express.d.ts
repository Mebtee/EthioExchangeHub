import type { AuthenticatedUser } from "./auth";

/**
 * Express request augmentation: `requireAuth` attaches the authenticated user
 * to `req.user`, so downstream controllers/handlers can rely on it without
 * re-decoding the token. Type-only — no runtime code.
 */
declare global {
  namespace Express {
    interface Request {
      /** Authenticated user attached by the `createRequireAuth` middleware. */
      user?: AuthenticatedUser;
    }
  }
}

export {};
