import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createCustomerApiKey,
  createCustomerSubscription,
  fetchCustomerApiKeys,
  fetchCustomerKeyUsage,
  fetchCustomerPaymentMethods,
  fetchCustomerPayments,
  fetchCustomerPlans,
  fetchCustomerSubscription,
  fetchCustomerUsage,
  registerCustomer,
  revokeCustomerApiKey,
  submitCustomerPayment,
  uploadCustomerReceipt,
  type RegisterPayload,
} from "@/lib/api/customer";
import { ApiError } from "@/lib/api/client";
import { customerKeys } from "@/lib/query-keys";
import type { CustomerSubscription } from "@/types/customer";

/**
 * Customer developer-portal data hooks (Phase 6).
 *
 * Every hook calls the real backend through `src/lib/api/customer.ts` and
 * follows the `use-admin.ts` conventions. Mutations invalidate every query
 * whose payload they can affect so the dashboard/usage/subscription views
 * never show stale commercial state.
 */

/**
 * The subscription endpoint answers 404 when the customer has none — that is
 * a normal onboarding state, not an error, so it resolves to `null`.
 */
export function useCustomerSubscription() {
  return useQuery({
    queryKey: customerKeys.subscription(),
    queryFn: async (): Promise<CustomerSubscription | null> => {
      try {
        return await fetchCustomerSubscription();
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
}

export function useCustomerPlans() {
  return useQuery({ queryKey: customerKeys.plans(), queryFn: fetchCustomerPlans });
}

export function useCustomerApiKeys() {
  return useQuery({ queryKey: customerKeys.apiKeys(), queryFn: fetchCustomerApiKeys });
}

export function useCustomerPayments() {
  return useQuery({ queryKey: customerKeys.payments(), queryFn: fetchCustomerPayments });
}

export function useCustomerPaymentMethods() {
  return useQuery({
    queryKey: customerKeys.paymentMethods(),
    queryFn: fetchCustomerPaymentMethods,
  });
}

export function useCustomerUsage() {
  return useQuery({ queryKey: customerKeys.usage(), queryFn: fetchCustomerUsage });
}

/** Per-key drill-down (`GET /customer/usage/:id`) — only fetched on demand. */
export function useCustomerKeyUsage(keyId: string | null) {
  return useQuery({
    queryKey: customerKeys.keyUsage(keyId ?? ""),
    queryFn: () => fetchCustomerKeyUsage(keyId!),
    enabled: keyId !== null,
  });
}

// ---- Mutations ----

/** Registration is followed by an automatic login at the call site. */
export function useRegisterCustomer() {
  return useMutation({ mutationFn: (payload: RegisterPayload) => registerCustomer(payload) });
}

/** Selecting a plan touches subscription + everything derived from it. */
export function useCreateCustomerSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => createCustomerSubscription(planId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.subscription() });
      void queryClient.invalidateQueries({ queryKey: customerKeys.usage() });
      void queryClient.invalidateQueries({ queryKey: customerKeys.payments() });
      void queryClient.invalidateQueries({ queryKey: customerKeys.apiKeys() });
    },
  });
}

export function useCreateCustomerApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCustomerApiKey,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.apiKeys() });
      void queryClient.invalidateQueries({ queryKey: customerKeys.usage() });
    },
  });
}

export function useRevokeCustomerApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => revokeCustomerApiKey(keyId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.apiKeys() });
      void queryClient.invalidateQueries({ queryKey: customerKeys.usage() });
    },
  });
}

export function useSubmitCustomerPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitCustomerPayment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.payments() });
      void queryClient.invalidateQueries({ queryKey: customerKeys.subscription() });
    },
  });
}

export function useUploadCustomerReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, file }: { paymentId: string; file: File }) =>
      uploadCustomerReceipt(paymentId, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.payments() });
    },
  });
}
