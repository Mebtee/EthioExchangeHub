'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-provider';
import { useUiStore } from '@/lib/stores/ui-store';
import { Moon, Sun, Monitor, Bell, Eye, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ThemeMode } from '@/lib/types';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun; description: string }[] = [
  { value: 'light', label: 'Light', icon: Sun, description: 'Always light mode' },
  { value: 'dark', label: 'Dark', icon: Moon, description: 'Always dark mode' },
  { value: 'system', label: 'System', icon: Monitor, description: 'Follow system preference' },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { sidebar, setSidebar } = useUiStore();
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Customize your experience
        </p>
      </div>

      {/* Appearance */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Appearance
            </h2>
          </div>
        </div>
        <div className="card-body">
          <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Theme
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = theme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
                    isActive
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/20'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-6 w-6',
                      isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400',
                    )}
                  />
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isActive
                        ? 'text-primary-700 dark:text-primary-300'
                        : 'text-gray-600 dark:text-gray-400',
                    )}
                  >
                    {option.label}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Layout
            </h2>
          </div>
        </div>
        <div className="card-body">
          <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Sidebar
          </label>
          <div className="flex gap-3">
            {(['expanded', 'collapsed'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setSidebar(option)}
                className={cn(
                  'rounded-lg border-2 px-4 py-2 text-sm font-medium capitalize transition-all',
                  sidebar === option
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950/20 dark:text-primary-300'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400',
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Notifications
            </h2>
          </div>
        </div>
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Rate Alert Notifications
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Get notified when your rate alerts are triggered
              </p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                notifications ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600',
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  notifications ? 'translate-x-6' : 'translate-x-1',
                )}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
