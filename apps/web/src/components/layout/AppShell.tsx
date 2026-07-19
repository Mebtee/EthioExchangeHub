'use client';

import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUiStore } from '@/lib/stores/ui-store';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { sidebar } = useUiStore();
  const isCollapsed = sidebar === 'collapsed';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />

      {/* Main content area */}
      <div
        className={cn(
          'flex min-h-screen flex-col transition-all duration-300',
          isCollapsed ? 'lg:ml-16' : 'lg:ml-64',
        )}
      >
        <Header />

        <main className="flex-1 p-4 lg:p-6">
          <div className="mx-auto max-w-7xl animate-fade-in">{children}</div>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              &copy; {new Date().getFullYear()} EthioBanksHub. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                Privacy
              </a>
              <a href="#" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                Terms
              </a>
              <a href="#" className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                Support
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
