import { Link } from "react-router-dom";
import { Activity, ArrowRight, BookOpen, CreditCard, Gauge, KeyRound, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";

import { StatusBadge } from "@/components/admin/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/async-states";
import { PageHeader } from "@/components/shared/page-header";
import { SurfaceCard } from "@/components/shared/surface-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import {
  useCustomerApiKeys,
  useCustomerPayments,
  useCustomerSubscription,
  useCustomerUsage,
} from "@/hooks/use-customer";
import { useLocale } from "@/hooks";
import { formatDateTime, formatInt } from "@/lib/format";
import { paymentStatusTone, subscriptionStatusTone } from "@/lib/status";

/**
 * Customer dashboard (Phase 6) — one authoritative snapshot assembled purely
 * from backend payloads (subscription, usage, keys, payments). No billing or
 * quota value is computed client-side beyond the usage percentage display.
 */
export default function CustomerDashboardPage() {
  const { t } = useTranslation();
  const { localize } = useLocale();
  const { user } = useAuth();

  const subscription = useCustomerSubscription();
  const usage = useCustomerUsage();
  const apiKeys = useCustomerApiKeys();
  const payments = useCustomerPayments();

  const sub = subscription.data ?? null;
  const usageData = usage.data ?? null;
  const latestPayment = payments.data?.[0] ?? null;

  // Usage percentage is presentation-only (the backend remains the limiter).
  const usedPct =
    usageData && usageData.monthlyLimit && usageData.monthlyLimit > 0
      ? Math.min(100, Math.round((usageData.requestsUsed / usageData.monthlyLimit) * 100))
      : null;

  const activeKeyCount = (apiKeys.data ?? []).filter((k) => !k.revokedAt).length;

  const quickLinks = [
    { to: "/customer/api-keys", icon: KeyRound, label: t("customer.nav.apiKeys") },
    { to: "/customer/plans", icon: Layers, label: t("customer.nav.plans") },
    { to: "/customer/usage", icon: Activity, label: t("customer.nav.usage") },
    { to: "/customer/payments", icon: CreditCard, label: t("customer.nav.payments") },
    { to: "/customer/developer", icon: BookOpen, label: t("customer.nav.developer") },
  ] as const;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("customer.dashboard.title", { name: user?.name ?? "" })}
        description={t("customer.dashboard.subtitle")}
      />

      {/* Subscription summary */}
      <SurfaceCard className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("customer.dashboard.currentPlan")}
            </p>
            {subscription.isLoading ? (
              <Skeleton className="mt-1 h-8 w-40" />
            ) : subscription.isError ? (
              <p className="mt-1 text-sm text-destructive">{t("common.unableToLoad")}</p>
            ) : sub ? (
              <h2 className="mt-1 text-2xl font-bold">
                {usageData?.subscription?.planName ?? t("customer.subscription.planFallback")}
              </h2>
            ) : (
              <h2 className="mt-1 text-2xl font-bold">{t("customer.dashboard.noPlan")}</h2>
            )}
          </div>
          <div className="flex items-center gap-3">
            {sub && (
              <StatusBadge tone={subscriptionStatusTone(sub.status)}>
                {t(`customer.status.${sub.status}`, sub.status)}
              </StatusBadge>
            )}
            {!sub && (
              <Button asChild>
                <Link to={localize("/customer/plans")}>
                  {t("customer.dashboard.choosePlan")}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {sub && (
          <dl className="mt-6 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">{t("customer.dashboard.billingPeriod")}</dt>
              <dd className="font-medium">
                {sub.currentPeriodStart && sub.currentPeriodEnd
                  ? `${formatDateTime(sub.currentPeriodStart)} → ${formatDateTime(sub.currentPeriodEnd)}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("customer.dashboard.renewsOn")}</dt>
              <dd className="font-medium">
                {sub.currentPeriodEnd ? formatDateTime(sub.currentPeriodEnd) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("customer.usage.rpmLimit")}</dt>
              <dd className="font-medium">
                {usageData?.subscription?.requestsPerMinute ?? t("customer.common.notAvailable")}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("customer.dashboard.apiKeysCount")}</dt>
              <dd className="font-medium">{apiKeys.isLoading ? "…" : `${activeKeyCount}`}</dd>
            </div>
          </dl>
        )}
      </SurfaceCard>

      {/* Usage snapshot */}
      {usage.isError ? (
        <ErrorState
          message={usage.error instanceof Error ? usage.error.message : undefined}
          onRetry={() => void usage.refetch()}
        />
      ) : usageData ? (
        <SurfaceCard className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-semibold">
              <Gauge className="size-4 text-primary" />
              {t("customer.dashboard.usageThisPeriod")}
            </h3>
            <Link
              to={localize("/customer/usage")}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {t("customer.dashboard.viewUsage")}
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("customer.usage.requestsUsed")}
              </p>
              <p className="mt-1 text-2xl font-bold">{formatInt(usageData.requestsUsed)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("customer.usage.monthlyQuota")}
              </p>
              <p className="mt-1 text-2xl font-bold">
                {usageData.monthlyLimit === null ? "—" : formatInt(usageData.monthlyLimit)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("customer.usage.remaining")}
              </p>
              <p className="mt-1 text-2xl font-bold">
                {usageData.requestsRemaining === null
                  ? "—"
                  : formatInt(usageData.requestsRemaining)}
              </p>
            </div>
          </div>
          {usedPct !== null && (
            <div className="mt-5">
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-surface-high"
                role="progressbar"
                aria-valuenow={usedPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t("customer.usage.quotaProgress")}
              >
                <div
                  className={`h-full rounded-full transition-all ${
                    usedPct >= 100 ? "bg-destructive" : usedPct >= 80 ? "bg-gold" : "bg-primary"
                  }`}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{usedPct}%</p>
            </div>
          )}
        </SurfaceCard>
      ) : null}

      {/* Latest payment */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SurfaceCard className="p-6">
          <h3 className="font-semibold">{t("customer.dashboard.latestPayment")}</h3>
          {payments.isLoading ? (
            <LoadingState />
          ) : latestPayment ? (
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <StatusBadge tone={paymentStatusTone(latestPayment.status)}>
                  {t(`customer.payment.status.${latestPayment.status}`, latestPayment.status)}
                </StatusBadge>
                <span className="font-medium">
                  {latestPayment.currency} {formatInt(latestPayment.amount)}
                </span>
              </div>
              <p className="text-muted-foreground">
                {latestPayment.submittedAt ? formatDateTime(latestPayment.submittedAt) : "—"}
              </p>
              {latestPayment.status === "rejected" && latestPayment.rejectionReason && (
                <p className="rounded-xl bg-destructive/10 px-4 py-3 text-destructive">
                  {latestPayment.rejectionReason}
                </p>
              )}
            </div>
          ) : (
            <EmptyState title={t("customer.dashboard.noPaymentsYet")} />
          )}
          <Link
            to={localize("/customer/payments")}
            className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
          >
            {t("customer.dashboard.goToPayments")}
          </Link>
        </SurfaceCard>

        {/* Quick links */}
        <SurfaceCard className="p-6">
          <h3 className="font-semibold">{t("customer.dashboard.quickLinks")}</h3>
          <nav className="mt-4 grid gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={localize(link.to)}
                className="flex items-center gap-3 rounded-xl border border-border/60 px-4 py-3 text-sm font-medium transition-colors hover:bg-surface-low"
              >
                <link.icon className="size-4 text-primary" />
                {link.label}
                <ArrowRight className="ml-auto size-4 text-muted-foreground" />
              </Link>
            ))}
          </nav>
        </SurfaceCard>
      </div>
    </div>
  );
}
