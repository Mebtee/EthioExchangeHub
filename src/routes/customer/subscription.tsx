import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { StatusBadge } from "@/components/admin/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/async-states";
import { PageHeader } from "@/components/shared/page-header";
import { SurfaceCard } from "@/components/shared/surface-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomerPlans, useCustomerSubscription } from "@/hooks/use-customer";
import { useLocale } from "@/hooks";
import { formatDateTime, formatInt } from "@/lib/format";
import { subscriptionStatusTone } from "@/lib/status";

/**
 * Subscription page (Phase 6/8) — shows the authoritative backend subscription
 * details. Plan selection lives on the Plans page (canonical); this page
 * complements it with subscription status, billing periods, and payment CTAs.
 */
export default function CustomerSubscriptionPage() {
  const { t } = useTranslation();
  const { localize } = useLocale();
  const subscription = useCustomerSubscription();
  const plans = useCustomerPlans();

  const sub = subscription.data ?? null;
  const catalog = plans.data ?? [];
  const plan = catalog.find((p) => p.id === sub?.planId) ?? null;
  const pendingPlan = sub?.pendingUpgrade
    ? (catalog.find((p) => p.id === sub.pendingUpgrade!.planId) ?? null)
    : null;

  const hasPendingPayment = sub?.status === "pending" || Boolean(sub?.pendingUpgrade);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("customer.subscription.title")}
        description={t("customer.subscription.subtitle")}
      />

      {subscription.isError ? (
        <ErrorState
          message={subscription.error instanceof Error ? subscription.error.message : undefined}
          onRetry={() => void subscription.refetch()}
        />
      ) : subscription.isLoading ? (
        <SurfaceCard className="space-y-3 p-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </SurfaceCard>
      ) : sub ? (
        <>
          <SurfaceCard className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("customer.dashboard.currentPlan")}
                </p>
                <h2 className="mt-1 text-2xl font-bold">
                  {plan?.name ?? t("customer.subscription.planFallback")}
                </h2>
              </div>
              <StatusBadge tone={subscriptionStatusTone(sub.status)}>
                {t(`customer.status.${sub.status}`, sub.status)}
              </StatusBadge>
            </div>

            <dl className="mt-6 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">{t("customer.subscription.price")}</dt>
                <dd className="font-medium">
                  {plan
                    ? `${formatInt(plan.price)} ${plan.currency} / ${t("customer.plans.perMonth")}`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("customer.subscription.startsAt")}</dt>
                <dd className="font-medium">{formatDateTime(sub.startsAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("customer.dashboard.billingPeriod")}</dt>
                <dd className="font-medium">
                  {sub.currentPeriodStart && sub.currentPeriodEnd
                    ? `${formatDateTime(sub.currentPeriodStart)} → ${formatDateTime(sub.currentPeriodEnd)}`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("customer.subscription.createdAt")}</dt>
                <dd className="font-medium">{formatDateTime(sub.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("customer.subscription.updatedAt")}</dt>
                <dd className="font-medium">{formatDateTime(sub.updatedAt)}</dd>
              </div>
            </dl>

            {/* Pending payment CTA */}
            {hasPendingPayment && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gold-soft px-4 py-3 text-sm text-gold-foreground">
                <p>{t("customer.subscription.pendingPaymentNote")}</p>
                <Button asChild variant="outline" size="sm">
                  <Link to={localize("/customer/payments")}>
                    {t("customer.payments.submitAction")}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            )}
          </SurfaceCard>

          {/* Pending upgrade info — shown when an active plan has an upgrade awaiting payment */}
          {sub.pendingUpgrade && (
            <SurfaceCard className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("customer.subscription.pendingUpgradeTitle")}
                  </p>
                  <h3 className="mt-1 text-lg font-bold">
                    {pendingPlan?.name ?? t("customer.subscription.planFallback")}
                  </h3>
                </div>
                <StatusBadge tone="warning">
                  {t("customer.subscription.pendingUpgradeBadge")}
                </StatusBadge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {t("customer.subscription.pendingUpgradeNote")}
              </p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link to={localize("/customer/payments")}>
                  {t("customer.payments.submitAction")}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </SurfaceCard>
          )}
        </>
      ) : (
        <>
          <EmptyState
            title={t("customer.subscription.noneTitle")}
            message={t("customer.subscription.noneMessage")}
          />
          <div className="flex justify-center">
            <Button asChild>
              <Link to={localize("/customer/plans")}>
                {t("customer.dashboard.choosePlan")}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
