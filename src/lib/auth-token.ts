import type { AuthTokens } from "@/types/auth";

/**
 * JWT storage for the admin session.
 *
 * Tokens are kept in localStorage (namespaced keys) so the session survives
 * page reloads. The axios request interceptor reads the access token via
 * `getAccessToken()`. Never log or render these values.
 */
const ACCESS_TOKEN_KEY = "ethio-exchange.access-token";
const REFRESH_TOKEN_KEY = "ethio-exchange.refresh-token";

export function getAccessToken(): string | null {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(tokens: AuthTokens): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearTokens(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/** Base64-decodes the JWT payload without verifying the signature. */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const decoded = window.atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Expiry timestamp (ms) from the JWT `exp` claim, or null when absent. */
export function getTokenExpiryMs(token: string): number | null {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  return typeof exp === "number" ? exp * 1000 : null;
}

export function isTokenExpired(token: string, nowMs = Date.now()): boolean {
  const exp = getTokenExpiryMs(token);
  return exp !== null && exp <= nowMs;
}

/** Window event dispatched by the axios interceptor when a token refresh fails. */
export const SESSION_EXPIRED_EVENT = "auth:session-expired";
