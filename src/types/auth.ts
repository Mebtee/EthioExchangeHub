/** Role strings accepted by the admin area. */
export const ADMIN_ROLES = ["admin", "super_admin"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  /** Optional avatar URL; falls back to initials when absent. */
  avatarUrl?: string;
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
