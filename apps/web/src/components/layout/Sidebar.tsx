'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  Building2,
  Medal,
  Puzzle,
  Bell,
  UserCircle,
  Settings,
  ShieldCheck,
  Wallet,
  Heart,
  ChevronLeft,
  ChevronRight,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useUiStore } from '@/lib/stores/ui-store';
import { ThemeToggle } from '@/lib/theme-provider';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/types';

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
  { label: 'Exchange Rates', href: '/rates', icon: 'TrendingUp' },
  { label: 'Banks', href: '/banks', icon: 'Building2' },
  { label: 'Rankings', href: '/rankings', icon: 'Medal' },
  { label: 'Services', href: '/services', icon: 'Puzzle' },
  { label: 'Portfolio', href: '/portfolio', icon: 'Wallet', authRequired: true },
  { label: 'Favorites', href: '/favorites', icon: 'Heart', authRequired: true },
  { label: 'Alerts', href: '/alerts', icon: 'Bell' },
  { label: 'Account', href: '/account', icon: 'UserCircle' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
  { label: 'Admin', href: '/admin', icon: 'ShieldCheck', adminOnly: true },
];

const ICON_MAP: Record<string, typeof LayoutDashboard> = {
  LayoutDashboard,
  TrendingUp,
  Building2,
  Medal,
  Puzzle,
  Bell,
  UserCircle,
  Settings,
  ShieldCheck,
  Wallet,
  Heart,
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { sidebar, toggleSidebar, setSidebar, isMobileMenuOpen, setMobileMenuOpen } = useUiStore();

  const isCollapsed = sidebar === 'collapsed';
  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || user?.role === 'ADMIN',
  );

  return (
    <>
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-gray-800 dark:bg-gray-900',
          isMobileMenuOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0',
          isCollapsed ? 'w-16' : 'w-64',
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo section */}
        <div
          className={cn(
            'flex h-16 items-center border-b border-gray-200 dark:border-gray-800',
            isCollapsed ? 'justify-center px-0' : 'justify-between px-4',
          )}
        >
          {!isCollapsed && (
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
                EH
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                EthioBanksHub
              </span>
            </Link>
          )}
          {isCollapsed && (
            <Link href="/" className="flex items-center justify-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
                EH
              </div>
            </Link>
          )}
        </div>

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 scrollbar-thin">
          <ul className="space-y-1">
            {visibleItems.map((item) => {
              const Icon = ICON_MAP[item.icon];
              if (!Icon) return null;
              const isActive =
                item.href === '/'
                  ? pathname === '/' || pathname === '/dashboard'
                  : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100',
                      isCollapsed && 'justify-center px-2',
                    )}
                    title={item.label}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                    {item.badge && !isCollapsed && (
                      <span className="ml-auto rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div
          className={cn(
            'border-t border-gray-200 p-4 dark:border-gray-800',
            isCollapsed && 'px-2',
          )}
        >
          <div className={cn('flex items-center gap-2', isCollapsed && 'flex-col')}>
            <ThemeToggle />
            {!isCollapsed && (
              <button
                onClick={logout}
                className="btn-ghost flex-1 justify-start gap-2 text-sm"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            )}
            <button
              onClick={toggleSidebar}
              className="btn-ghost hidden rounded-lg p-1.5 lg:flex"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="absolute right-3 top-3 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </aside>
    </>
  );
}
