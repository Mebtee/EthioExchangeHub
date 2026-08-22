import type { AuthenticatedUser } from "./auth";
import type { CommercialApiContext } from "./commercial-api";

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
      /**
       * Commercial API context attached by `createCommercialApiAuth` (Phase 4)
       * — present ONLY on `/public/*` routes after successful API-key
       * authentication. Never exposed in responses.
       */
      commercialApi?: CommercialApiContext;
    }
  }
}

export {};
