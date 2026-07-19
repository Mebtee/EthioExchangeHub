// ── API Client ─────────────────────────────────────────────────
// Lightweight fetch wrapper with JWT interceptor and auto-refresh.

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1';

interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

let accessToken: string | null = null;

// ── Token Management ───────────────────────────────────────────
export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window !== 'undefined') {
    accessToken = localStorage.getItem('accessToken');
  }
  return accessToken;
}

export function clearAuth() {
  setAccessToken(null);
  if (typeof window !== 'undefined') {
    localStorage.removeItem('refreshToken');
  }
}

// ── Core Request ───────────────────────────────────────────────
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_URL}${endpoint}`;

  try {
    const res = await fetch(url, { ...options, headers });

    // Handle 401 — try refresh
    if (res.status === 401 && token) {
      const refreshed = await attemptRefresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${getAccessToken()}`;
        const retryRes = await fetch(url, { ...options, headers });
        const retryData = await retryRes.json();
        return retryData;
      }
    }

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        data: null,
        error: data.error ?? { code: 'UNKNOWN', message: data.message ?? 'Request failed' },
      };
    }

    return data;
  } catch (err) {
    return {
      success: false,
      data: null,
      error: { code: 'NETWORK_ERROR', message: (err as Error).message },
    };
  }
}

// ── Token Refresh ──────────────────────────────────────────────
async function attemptRefresh(): Promise<boolean> {
  const refreshToken =
    typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearAuth();
      return false;
    }

    const data = await res.json();
    setAccessToken(data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return true;
  } catch {
    clearAuth();
    return false;
  }
}

// ── Auth API ───────────────────────────────────────────────────
export const authApi = {
  register(data: { email: string; password: string; fullName: string; phoneNumber?: string }) {
    return request<{
      user: { id: string; email: string; fullName: string; role: string };
      accessToken: string;
      refreshToken: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  login(data: { email: string; password: string }) {
    return request<{
      user: { id: string; email: string; fullName: string; role: string };
      accessToken: string;
      refreshToken: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  refresh(refreshToken: string) {
    return request<{
      user: { id: string; email: string; fullName: string; role: string };
      accessToken: string;
      refreshToken: string;
    }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  logout() {
    return request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  },

  me() {
    return request<{ user: { sub: string; email: string; role: string } }>('/auth/me');
  },

  googleAuthUrl() {
    return `${API_URL}/auth/google`;
  },
};

// ── Users API ──────────────────────────────────────────────────
export const usersApi = {
  getMyProfile() {
    return request<{
      id: string;
      email: string;
      fullName: string;
      role: string;
      avatarUrl: string | null;
      phoneNumber: string | null;
      isVerified: boolean;
    }>('/users/me');
  },
};
