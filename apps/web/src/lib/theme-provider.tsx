'use client';

import { useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useUiStore } from '@/lib/stores/ui-store';
import { cn } from '@/lib/utils';
import type { ThemeMode } from '@/lib/types';

// ── Theme Context ──────────────────────────────────────────────
interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, resolvedTheme, setTheme, setResolvedTheme } = useUiStore();

  const applyTheme = useCallback(
    (mode: ThemeMode) => {
      const root = document.documentElement;
      let resolved: 'light' | 'dark';

      if (mode === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        resolved = prefersDark ? 'dark' : 'light';
      } else {
        resolved = mode;
      }

      root.classList.toggle('dark', resolved === 'dark');
      setResolvedTheme(resolved);
    },
    [setResolvedTheme],
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (useUiStore.getState().theme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}

// ── ThemeToggle Button ─────────────────────────────────────────
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  const icons: Record<ThemeMode, typeof Sun> = {
    light: Sun,
    dark: Moon,
    system: Monitor,
  };

  const labels: Record<ThemeMode, string> = {
    light: 'Light mode',
    dark: 'Dark mode',
    system: 'System theme',
  };

  const Icon = icons[theme];

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'btn-ghost rounded-lg p-2',
        'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100',
        className,
      )}
      title={labels[theme]}
      aria-label={labels[theme]}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
