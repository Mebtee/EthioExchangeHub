import jwt, { type SignOptions } from "jsonwebtoken";

import { AuthenticationError } from "./errors";
import type { SignedClaims } from "@/types/auth";

/**
 * JWT helpers (A1) shared by the auth service and the `requireAuth`
 * middleware — one signing/verification path, no duplication.
 *
 * Tokens are deliberately typed and discriminated:
 *   - access:  `{ sub, role, type: "access" }`       (short-lived)
 *   - refresh: `{ sub, type: "refresh" }`            (long-lived)
 *   - password-reset: `{ sub, purpose: "password-reset" }` (short-lived)
 *
 * Verification checks BOTH the signature and the expected discriminator, so
 * a stolen refresh token can never be used as an access token (or vice
 * versa). Any failure — malformed header, bad signature, wrong type,
 * expired token — collapses into a single `AuthenticationError` so clients
 * never learn why a token was rejected.
 */

/** Signs a token with the given claims and expiry (e.g. "15m", "30d"). */
export function signToken(claims: SignedClaims, secret: string, expiresIn: string): string {
  // `expiresIn` arrives as a plain string (env value); the library's type is a
  // narrow template-literal union, so the single boundary cast keeps callers
  // free to pass any ms-style string ("15m", "30d", ...).
  return jwt.sign(claims, secret, { expiresIn: expiresIn as SignOptions["expiresIn"] });
}

/** Discriminator that maps to a token's `type`/`purpose` claim. */
export type TokenKind = "access" | "refresh" | "password-reset";

/**
 * Verifies a token's signature and discriminator, returning its `sub` claim.
 * Throws `AuthenticationError` for every failure mode.
 */
export function verifyToken(token: string, secret: string, kind: TokenKind): { sub: string } {
  try {
    const decoded = jwt.verify(token, secret);
    if (typeof decoded === "string" || decoded === null || typeof decoded !== "object") {
      throw new Error("Token payload is not an object.");
    }
    // Narrow the library's index-signature payload to the claims we signed.
    const claims = decoded as unknown as { sub?: unknown; type?: unknown; purpose?: unknown };
    if (claims.sub === undefined || typeof claims.sub !== "string") {
      throw new Error("Token payload is missing the sub claim.");
    }
    if (kind === "password-reset") {
      if (claims.purpose !== "password-reset") {
        throw new Error("Token purpose does not match.");
      }
    } else if (claims.type !== kind) {
      throw new Error("Token type does not match.");
    }
    return { sub: claims.sub };
  } catch {
    throw new AuthenticationError("Invalid or expired token.");
  }
}
