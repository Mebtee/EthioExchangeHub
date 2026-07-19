'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, X, AlertCircle, TrendingUp, Wallet, Info } from 'lucide-react';
import { cn, formatTimeAgo } from '@/lib/utils';
import { useUiStore } from '@/lib/stores/ui-store';

interface Notification {
  id: string;
  type: 'rate_alert' | 'system' | 'portfolio' | 'favorite';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

const SAMPLE_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'rate_alert',
    title: 'USD Rate Alert',
    message: 'USD buy rate at CBE has reached 56.5000, above your target of 55.0000',
    severity: 'success',
    isRead: false,
    link: '/rates',
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: '2',
    type: 'system',
    title: 'Data Updated',
    message: 'Exchange rates have been refreshed for all banks',
    severity: 'info',
    isRead: false,
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: '3',
    type: 'portfolio',
    title: 'Portfolio Alert',
    message: 'Your EUR holding has increased in value',
    severity: 'success',
    isRead: true,
    link: '/portfolio',
    createdAt: new Date(Date.now() - 120 * 60000).toISOString(),
  },
];

const TYPE_ICONS: Record<string, typeof Bell> = {
  rate_alert: TrendingUp,
  system: Info,
  portfolio: Wallet,
  favorite: Bell,
};

const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  error: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  success: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
};

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>(SAMPLE_NOTIFICATIONS);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-notification-center]')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [isOpen]);

  return (
    <div data-notification-center className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-ghost relative rounded-lg p-2"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-gray-950">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 animate-fade-in rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Bell className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                <p className="mt-2 text-xs text-gray-400">No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = TYPE_ICONS[notification.type] ?? Bell;
                return (
                  <div
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={cn(
                      'flex cursor-pointer gap-3 border-b border-gray-50 px-4 py-3 transition-colors last:border-0 hover:bg-gray-50 dark:border-gray-700/50 dark:hover:bg-gray-750',
                      !notification.isRead && 'bg-primary-50/30 dark:bg-primary-950/10',
                    )}
                  >
                    <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg', SEVERITY_COLORS[notification.severity])}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm', !notification.isRead ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400')}>
                        {notification.title}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-[10px] text-gray-400">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary-500" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
