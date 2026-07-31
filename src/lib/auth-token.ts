/**
 * Access-token storage for authenticated API requests.
 * Consumed by the axios request interceptor in `lib/api/client.ts`.
 * Extend with set/clear helpers when the auth flow (login/refresh) is built.
 */
const ACCESS_TOKEN_KEY = "ethio-exchange.access-token";

export function getAccessToken(): string | null {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}
