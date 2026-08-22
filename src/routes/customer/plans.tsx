import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { StatusBadge } from "@/components/admin/status-badge";
import { ErrorState, LoadingState } from "@/components/shared/async-states";
import { PageHeader } from "@/components/shared/page-header";
import { SurfaceCard } from "@/components/shared/surface-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateCustomerSubscription,
  useCustomerPlans,
  useCustomerSubscription,
} from "@/hooks/use-customer";
import { formatInt } from "@/lib/format";
import type { CustomerPlan } from "@/types/customer";

/**
 * Plans & pricing (Phase 6) — the backend catalog is the single source of
 * truth; no prices or limits are hardcoded here.
 */
export default function CustomerPlansPage() {
  const { t } = useTranslation();
  const plans = useCustomerPlans();
  const subscription = useCustomerSubscription();
  const selectPlan = useCreateCustomerSubscription();

  const current = subscription.data ?? null;
  /** A blocking subscription (pending/active/suspended) hides subscribe buttons. */
  const canSelectPlan =
    current === null || ["expired", "cancelled"].includes(String(current.status));

  async function handleSubscribe(plan: CustomerPlan) {
    try {
      await selectPlan.mutateAsync(plan.id);
      if (plan.price > 0) {
        toast.info(t("customer.plans.pendingToast"));
      } else {
        toast.success(t("customer.plans.freeActivatedToast"));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.unableToLoad"));
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t("customer.plans.title")} description={t("customer.plans.subtitle")} />

      {plans.isError ? (
        <ErrorState
          message={plans.error instanceof Error ? plans.error.message : undefined}
          onRetry={() => void plans.refetch()}
        />
      ) : plans.isLoading ? (
        <LoadingState />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {(plans.data ?? []).map((plan) => {
            const isCurrent = current?.planId === plan.id;
            return (
              <SurfaceCard
                key={plan.id}
                className={`flex flex-col p-6 ${isCurrent ? "ring-2 ring-primary" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  {isCurrent && (
                    <StatusBadge tone="success">{t("customer.plans.currentBadge")}</StatusBadge>
                  )}
                </div>
                {plan.description && (
                  <p className="mt-1 min-h-10 text-sm text-muted-foreground">{plan.description}</p>
                )}
                <p className="mt-4">
                  <span className="text-3xl font-bold">{formatInt(plan.price)}</span>
                  <span className="text-sm text-muted-foreground">
                    {" "}
                    {plan.currency} / {t("customer.plans.perMonth")}
                  </span>
                </p>

                <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-primary" />
                    {t("customer.plans.monthlyRequests", {
                      count: formatInt(plan.monthlyRequestLimit),
                    })}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-primary" />
                    {t("customer.plans.rpm", { count: plan.requestsPerMinute })}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-primary" />
                    {t("customer.plans.maxKeys", { count: plan.maxApiKeys })}
                  </li>
                </ul>

                <div className="mt-6">
                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      {t("customer.plans.currentBadge")}
                    </Button>
                  ) : canSelectPlan ? (
                    <Button
                      className="w-full"
                      disabled={!canSelectPlan || selectPlan.isPending}
                      onClick={() => void handleSubscribe(plan)}
                    >
                      {selectPlan.isPending
                        ? t("common.loading")
                        : plan.price > 0
                          ? t("customer.plans.subscribePaid")
                          : t("customer.plans.subscribeFree")}
                    </Button>
                  ) : (
                    <p className="rounded-xl bg-surface-low px-4 py-3 text-xs text-muted-foreground">
                      {t("customer.plans.blockedNote")}
                    </p>
                  )}
                  {plan.price > 0 && !isCurrent && canSelectPlan && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("customer.plans.manualPaymentNote")}
                    </p>
                  )}
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      )}

      <p className="max-w-3xl text-sm text-muted-foreground">
        {t("customer.plans.billingExplainer")}
      </p>
    </div>
  );
}
