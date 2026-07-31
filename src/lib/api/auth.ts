import { apiClient } from "./client";
import type {
  AuthSession,
  AuthTokens,
  AuthUser,
  ForgotPasswordPayload,
  LoginPayload,
  ResetPasswordPayload,
} from "@/types/auth";

/** POST /auth/login — exchanges credentials for tokens + user. */
export async function login(payload: LoginPayload): Promise<AuthSession> {
  const { data } = await apiClient.post<AuthSession>("/auth/login", payload);
  return data;
}

/** POST /auth/logout — invalidates the server-side session (best effort). */
export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

/** POST /auth/refresh — exchanges a refresh token for a fresh token pair. */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const { data } = await apiClient.post<AuthTokens>("/auth/refresh", { refreshToken });
  return data;
}

/** GET /auth/me — resolves the current authenticated user. */
export async function fetchCurrentUser(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>("/auth/me");
  return data;
}

/** POST /auth/forgot-password — requests a password-reset email. */
export async function requestPasswordReset(payload: ForgotPasswordPayload): Promise<void> {
  await apiClient.post("/auth/forgot-password", payload);
}

/** POST /auth/reset-password — applies a new password with the reset token. */
export async function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  await apiClient.post("/auth/reset-password", payload);
}
