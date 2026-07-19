'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeMode, SidebarView, TabId } from '@/lib/types';

interface UiState {
  // Theme
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  resolvedTheme: 'light' | 'dark';
  setResolvedTheme: (theme: 'light' | 'dark') => void;

  // Sidebar
  sidebar: SidebarView;
  setSidebar: (view: SidebarView) => void;
  toggleSidebar: () => void;

  // Active tabs
  activeRateTab: TabId;
  setActiveRateTab: (tab: TabId) => void;

  // Search
  globalSearch: string;
  setGlobalSearch: (query: string) => void;

  // Mobile
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;

  // Notifications
  showNotification: boolean;
  notificationMessage: string;
  notificationType: 'success' | 'error' | 'info';
  triggerNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissNotification: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      // Theme
      theme: 'system',
      resolvedTheme: 'light',
      setTheme: (theme) => set({ theme }),
      setResolvedTheme: (theme) => set({ resolvedTheme: theme }),

      // Sidebar
      sidebar: 'expanded',
      setSidebar: (view) => set({ sidebar: view }),
      toggleSidebar: () =>
        set((state) => ({
          sidebar: state.sidebar === 'expanded' ? 'collapsed' : 'expanded',
        })),

      // Active tabs
      activeRateTab: 'latest',
      setActiveRateTab: (tab) => set({ activeRateTab: tab }),

      // Search
      globalSearch: '',
      setGlobalSearch: (query) => set({ globalSearch: query }),

      // Mobile
      isMobileMenuOpen: false,
      setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),

      // Notifications
      showNotification: false,
      notificationMessage: '',
      notificationType: 'info',
      triggerNotification: (message, type = 'info') =>
        set({ showNotification: true, notificationMessage: message, notificationType: type }),
      dismissNotification: () => set({ showNotification: false }),
    }),
    {
      name: 'ethiobankshub-ui',
      partialize: (state) => ({
        theme: state.theme,
        sidebar: state.sidebar,
        activeRateTab: state.activeRateTab,
      }),
    },
  ),
);
