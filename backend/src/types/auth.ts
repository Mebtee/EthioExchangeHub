/**
 * Authentication domain types (A1).
 *
 * These mirror the frontend auth contract (`src/types/auth.ts` + the axios
 * interceptor in `src/lib/api/client.ts`) exactly: login returns a token pair
 * plus the user, refresh returns a fresh pair, and `GET /auth/me` resolves
 * the authenticated user. Nothing is invented — the payloads come from the
 * persisted `users` row.
 */

/** Authenticated admin user as returned by login and `/auth/me`. */
export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  /** Avatar URL, or null when the user has none (frontend falls back to initials). */
  avatarUrl: string | null;
  /** Real account-creation timestamp from the `users` row, or null when unset. */
  memberSince: string | null;
  /** Real last-login timestamp stamped on every successful login, or null when unset. */
  lastLogin: string | null;
}

/** Signed token pair returned by login and refresh. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Login response: tokens + the authenticated user. */
export interface AuthSession {
  tokens: AuthTokens;
  user: AuthenticatedUser;
}

/** Validated payload for customer registration (`POST /auth/register`). */
export interface RegisterInput {
  email: string;
  password: string;
  /** Optional company name persisted to the `customers` profile row. */
  companyName?: string;
  /** Optional phone number persisted to the `customers` profile row. */
  phone?: string;
}

/** JWT claims carried in the access token. */
export interface AccessTokenClaims {
  /** User id. */
  sub: string;
  /** Current role (checked against `ADMIN_ROLES` at request time). */
  role: string;
  /** Always `"access"` — distinguishes access from refresh tokens. */
  type: "access";
}

/** JWT claims carried in the refresh token. */
export interface RefreshTokenClaims {
  /** User id. */
  sub: string;
  /** Always `"refresh"`. */
  type: "refresh";
}

/** JWT claims carried in a password-reset token (short-lived, one purpose). */
export interface PasswordResetClaims {
  /** User id. */
  sub: string;
  /** Always `"password-reset"`. */
  purpose: "password-reset";
}

/** Union of every token shape this service signs. */
export type SignedClaims = AccessTokenClaims | RefreshTokenClaims | PasswordResetClaims;
