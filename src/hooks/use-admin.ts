import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAdminBankAccount,
  createManualRate,
  deleteManualRate,
  fetchAdminBankAccounts,
  fetchAdminDashboard,
  fetchAdminPayments,
  fetchAdminProfile,
  fetchAdminSettings,
  fetchManualRates,
  fetchRateTrend,
  fetchScrapeLogs,
  fetchScraperHealth,
  fetchScraperHealthList,
  reviewAdminPayment,
  updateAdminBankAccount,
  updateAdminProfile,
  updateAdminSettings,
  updateManualRate,
} from "@/lib/api/admin";
import type { AdminPaymentStatusFilter } from "@/lib/api/admin";
import { adminKeys } from "@/lib/query-keys";
import type { AdminBankAccountUpdate, AdminReviewAction, ManualRateUpdate } from "@/types/admin";

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

// ---- Payment review + bank-account management ----

export function useAdminPayments(status?: AdminPaymentStatusFilter) {
  return useQuery({
    queryKey: adminKeys.payments(status),
    queryFn: () => fetchAdminPayments(status),
  });
}

/** Review transitions invalidate every status slice (the row moves between them). */
function useInvalidatePayments() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: [...adminKeys.all, "payments"] });
  };
}

export function useReviewAdminPayment() {
  const invalidatePayments = useInvalidatePayments();
  return useMutation({
    mutationFn: ({
      paymentId,
      action,
      rejectionReason,
    }: {
      paymentId: string;
      action: AdminReviewAction;
      rejectionReason?: string;
    }) => reviewAdminPayment(paymentId, action, rejectionReason),
    onSuccess: invalidatePayments,
  });
}

export function useAdminBankAccounts() {
  return useQuery({
    queryKey: adminKeys.bankAccounts(),
    queryFn: fetchAdminBankAccounts,
  });
}

export function useCreateAdminBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAdminBankAccount,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.bankAccounts() });
    },
  });
}

export function useUpdateAdminBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminBankAccountUpdate }) =>
      updateAdminBankAccount(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.bankAccounts() });
    },
  });
}
