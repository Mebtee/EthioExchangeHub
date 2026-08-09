/** Role strings accepted by the admin area. */
export const ADMIN_ROLES = ["admin", "super_admin"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export interface AuthUser {
  /** User id (uuid from the backend `users` table). */
  id: string;
  name: string;
  email: string;
  role: string;
  /** Avatar URL, or null when the user has none; falls back to initials. */
  avatarUrl?: string | null;
  /** Real account-creation timestamp, or null when unset. */
  memberSince?: string | null;
  /** Real last-login timestamp, or null when unset. */
  lastLogin?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSession {
  tokens: AuthTokens;
  user: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}
