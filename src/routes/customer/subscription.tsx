import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { StatusBadge } from "@/components/admin/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/async-states";
import { PageHeader } from "@/components/shared/page-header";
import { SurfaceCard } from "@/components/shared/surface-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateCustomerSubscription,
  useCustomerPlans,
  useCustomerSubscription,
} from "@/hooks/use-customer";
import { useLocale } from "@/hooks";
import { formatDateTime, formatInt } from "@/lib/format";
import { planSelectionState } from "@/lib/plans";
import { subscriptionStatusTone } from "@/lib/status";

/**
 * Subscription page (Phase 6) — shows the authoritative backend subscription
 * and lets the customer select a plan. An active subscription upgrades to
 * any strictly pricier plan; pending/suspended block selection and paid
 * plans route the customer to the manual bank-transfer payment flow.
 */
export default function CustomerSubscriptionPage() {
  const { t } = useTranslation();
  const { localize } = useLocale();
  const subscription = useCustomerSubscription();
  const plans = useCustomerPlans();
  const selectPlan = useCreateCustomerSubscription();

  const sub = subscription.data ?? null;
  const catalog = plans.data ?? [];
  /** The ACTIVE plan is the effective one while an upgrade awaits payment. */
  const isActiveSub = sub?.status === "active";
  /** Highlighted plan: the effective one, or the selection awaiting payment. */
  const highlightedPlanId =
    sub?.pendingUpgrade?.planId ??
    (sub && ["active", "pending", "suspended"].includes(String(sub.status)) ? sub.planId : null);
  const plan = catalog.find((p) => p.id === sub?.planId) ?? null;

  async function handleSubscribe(planId: string) {
    try {
      await selectPlan.mutateAsync(planId);
      toast.success(t("customer.subscription.selectedToast"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.unableToLoad"));
    }
  }

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

          {/* Manual payment guidance for pending paid selections — both the
              no-active-row case and an upgrade pending behind an ACTIVE one. */}
          {(sub.status === "pending" || sub.pendingUpgrade) && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gold-soft px-4 py-3 text-sm text-gold-foreground">
              <p>{t("customer.subscription.pendingPaymentNote")}</p>
              <Button asChild variant="outline" size="sm">
                <Link to={localize("/customer/payments")}>
                  {t("customer.nav.payments")}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          )}
        </SurfaceCard>
      ) : (
        <EmptyState
          title={t("customer.subscription.noneTitle")}
          message={t("customer.subscription.noneMessage")}
        />
      )}

      {/* Plan selection */}
      <SurfaceCard className="p-6">
        <h3 className="font-semibold">{t("customer.subscription.selectTitle")}</h3>
        {plans.isError ? (
          <ErrorState
            message={plans.error instanceof Error ? plans.error.message : undefined}
            onRetry={() => void plans.refetch()}
          />
        ) : plans.isLoading ? (
          <LoadingState />
        ) : (
          <>
            <ul className="mt-4 divide-y divide-border/60">
              {(plans.data ?? []).map((p) => {
                const state = planSelectionState(sub, catalog, p.id);
                const isCurrent = p.id === highlightedPlanId;
                return (
                  <li key={p.id} className="flex flex-wrap items-center gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {p.name}
                        {isCurrent && (
                          <span className="ml-2 text-xs font-semibold text-primary">
                            {t("customer.plans.currentBadge")}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatInt(p.monthlyRequestLimit)} · {p.requestsPerMinute} RPM ·{" "}
                        {formatInt(p.price)} {p.currency}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={isCurrent || state.block === "downgrade" ? "outline" : "default"}
                      disabled={!state.selectable || selectPlan.isPending}
                      onClick={() => void handleSubscribe(p.id)}
                    >
                      {isCurrent
                        ? t("customer.plans.currentBadge")
                        : state.block === "downgrade"
                          ? t("customer.plans.subscribePaid")
                          : isActiveSub
                            ? t("customer.plans.upgrade")
                            : p.price > 0
                              ? t("customer.plans.subscribePaid")
                              : t("customer.plans.subscribeFree")}
                    </Button>
                  </li>
                );
              })}
            </ul>
            {sub &&
              (sub.status === "pending" ||
                sub.status === "suspended" ||
                Boolean(sub.pendingUpgrade)) && (
                <p className="mt-3 rounded-xl bg-surface-low px-4 py-3 text-xs text-muted-foreground">
                  {t("customer.plans.blockedNote")}
                </p>
              )}
          </>
        )}
      </SurfaceCard>
    </div>
  );
}
