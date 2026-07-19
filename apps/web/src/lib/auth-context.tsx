'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { authApi, setAccessToken, clearAuth } from './api';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'USER' | 'ADMIN';
  avatarUrl?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    fullName: string,
    email: string,
    password: string,
    phoneNumber?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.me();
      if (res.success && res.data?.user) {
        const { sub, email, role } = res.data.user;
        setUser({ id: sub, email, fullName: '', role: role as 'USER' | 'ADMIN' });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login({ email, password });

      if (!res.success || !res.data) {
        return { success: false, error: res.error?.message ?? 'Login failed' };
      }

      setAccessToken(res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      setUser({
        id: res.data.user.id,
        email: res.data.user.email,
        fullName: res.data.user.fullName,
        role: res.data.user.role as 'USER' | 'ADMIN',
      });

      router.push('/dashboard');
      return { success: true };
    },
    [router],
  );

  const register = useCallback(
    async (fullName: string, email: string, password: string, phoneNumber?: string) => {
      const res = await authApi.register({ fullName, email, password, phoneNumber });

      if (!res.success || !res.data) {
        return { success: false, error: res.error?.message ?? 'Registration failed' };
      }

      setAccessToken(res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      setUser({
        id: res.data.user.id,
        email: res.data.user.email,
        fullName: res.data.user.fullName,
        role: res.data.user.role as 'USER' | 'ADMIN',
      });

      router.push('/dashboard');
      return { success: true };
    },
    [router],
  );

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    clearAuth();
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper needed in auth-context — getAccessToken from api.ts
function getAccessToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
}
