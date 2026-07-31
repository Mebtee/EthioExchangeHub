import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { clearTokens, getAccessToken, SESSION_EXPIRED_EVENT, setTokens } from "@/lib/auth-token";
import { fetchCurrentUser, login as loginRequest, logout as logoutRequest } from "@/lib/api/auth";
import type { AuthUser, LoginPayload } from "@/types/auth";

interface AuthContextValue {
  /** The authenticated admin user, or null when signed out. */
  user: AuthUser | null;
  /** True while the persisted session is being validated on first load. */
  isLoading: boolean;
  /** True when a valid session exists. */
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  /** Role-based authorization helper. */
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Session persistence: restore the user from /auth/me when a token exists.
  useEffect(() => {
    let active = true;

    async function restoreSession() {
      if (!getAccessToken()) {
        setIsLoading(false);
        return;
      }
      try {
        const currentUser = await fetchCurrentUser();
        if (active) setUser(currentUser);
      } catch {
        // 401s are auto-refreshed by the interceptor; when that fails the
        // tokens are cleared and the user is treated as signed out.
        if (active) {
          clearTokens();
          setUser(null);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void restoreSession();

    // The axios interceptor dispatches this when a token refresh fails.
    const onSessionExpired = () => {
      clearTokens();
      setUser(null);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);

    return () => {
      active = false;
      window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const session = await loginRequest(payload);
    setTokens(session.tokens);
    setUser(session.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // Ignore server errors — the local session is cleared regardless.
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  const hasRole = useCallback(
    (...roles: string[]) => {
      return user !== null && roles.includes(user.role);
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      login,
      logout,
      hasRole,
    }),
    [user, isLoading, login, logout, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return ctx;
}
