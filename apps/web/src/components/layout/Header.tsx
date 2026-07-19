'use client';

import { Menu, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useUiStore } from '@/lib/stores/ui-store';
import { NotificationDropdown } from '@/components/notifications/NotificationCenter';
import { LocaleSwitcher } from '@/components/common/LocaleSwitcher';

export function Header() {
  const { user } = useAuth();
  const { setMobileMenuOpen, globalSearch, setGlobalSearch } = useUiStore();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/80 lg:px-6">
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="btn-ghost rounded-lg p-2 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search */}
      <div className="relative flex-1 max-w-md hidden sm:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search banks, currencies, services..."
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          className="input-field pl-9"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Locale switcher */}
        <LocaleSwitcher />

        {/* Notifications dropdown */}
        <NotificationDropdown />

        {/* User avatar */}
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {user?.fullName ?? 'User'}
            </p>
            <p className="text-xs text-gray-500 capitalize dark:text-gray-400">
              {user?.role?.toLowerCase() ?? 'Guest'}
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
            {user?.fullName?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
