import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createManualRate,
  deleteManualRate,
  fetchAdminDashboard,
  fetchAdminProfile,
  fetchAdminSettings,
  fetchManualRates,
  fetchRateTrend,
  fetchScrapeLogs,
  fetchScraperHealth,
  fetchScraperHealthList,
  updateAdminProfile,
  updateAdminSettings,
  updateManualRate,
} from "@/lib/api/admin";
import { adminKeys } from "@/lib/query-keys";
import type { ManualRateUpdate } from "@/types/admin";

/**
 * Admin data hooks — every hook calls the real backend through the matching
 * function in `src/lib/api/admin.ts`. No mock data exists anywhere; failures
 * surface as loading/empty/API-error states.
 */

export function useDashboardStats() {
  return useQuery({
    queryKey: adminKeys.dashboard(),
    queryFn: fetchAdminDashboard,
  });
}

export function useRateTrend() {
  return useQuery({
    queryKey: adminKeys.rateTrend(),
    queryFn: fetchRateTrend,
  });
}

export function useManualRates() {
  return useQuery({
    queryKey: adminKeys.manualRates(),
    queryFn: fetchManualRates,
  });
}

export function useScrapeLogs(limit?: number) {
  return useQuery({
    queryKey: adminKeys.scrapeLogs(limit),
    queryFn: () => fetchScrapeLogs(limit),
  });
}

export function useScraperHealth() {
  return useQuery({
    queryKey: adminKeys.scraperHealth(),
    queryFn: fetchScraperHealth,
  });
}

export function useScraperHealthList() {
  return useQuery({
    queryKey: adminKeys.scraperHealthList(),
    queryFn: fetchScraperHealthList,
  });
}

export function useAdminProfile() {
  return useQuery({
    queryKey: adminKeys.profile(),
    queryFn: fetchAdminProfile,
  });
}

export function useAdminSettings() {
  return useQuery({
    queryKey: adminKeys.settings(),
    queryFn: fetchAdminSettings,
  });
}

export function useUpdateAdminProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAdminProfile,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.profile() });
    },
  });
}

export function useUpdateAdminSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAdminSettings,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.settings() });
    },
  });
}

export function useCreateManualRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createManualRate,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.manualRates() });
    },
  });
}

export function useUpdateManualRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ManualRateUpdate }) =>
      updateManualRate(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.manualRates() });
    },
  });
}

export function useDeleteManualRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteManualRate,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.manualRates() });
    },
  });
}
