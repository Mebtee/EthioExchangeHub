import { useState } from "react";
import { Info, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";

import { StatusBadge } from "@/components/admin/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/async-states";
import { PageHeader } from "@/components/shared/page-header";
import { SurfaceCard } from "@/components/shared/surface-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCustomerKeyUsage, useCustomerUsage } from "@/hooks/use-customer";
import { formatDateTime, formatInt } from "@/lib/format";
import { subscriptionStatusTone } from "@/lib/status";

/**
 * Usage analytics (Phase 6 over the Phase 4 backend). Distinguishes the
 * MONTHLY QUOTA (successful responses per billing period) from the RPM
 * limit (request rate per minute). All values come from the backend; the
 * percentage is presentation-only.
 */
export default function CustomerUsagePage() {
  const { t } = useTranslation();
  const usage = useCustomerUsage();
  /** Selected key for the per-key drill-down dialog (`GET /usage/:id`). */
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const keyUsage = useCustomerKeyUsage(selectedKeyId);

  if (usage.isError) {
    return (
      <div className="space-y-8">
        <PageHeader title={t("customer.usage.title")} description={t("customer.usage.subtitle")} />
        <ErrorState
          message={usage.error instanceof Error ? usage.error.message : undefined}
          onRetry={() => void usage.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t("customer.usage.title")} description={t("customer.usage.subtitle")} />

      {usage.isLoading ? (
        <LoadingState />
      ) : !usage.data || usage.data.subscription === null ? (
        <EmptyState
          title={t("customer.usage.noSubscriptionTitle")}
          message={t("customer.usage.noSubscriptionMessage")}
        />
      ) : (
        (() => {
          const data = usage.data;
          const sub = data.subscription;
          if (!sub) return null;
          const pct =
            data.monthlyLimit && data.monthlyLimit > 0
              ? Math.min(100, Math.round((data.requestsUsed / data.monthlyLimit) * 100))
              : null;
          const exhausted = data.requestsRemaining !== null && data.requestsRemaining <= 0;

          return (
            <>
              {/* Monthly quota card */}
              <SurfaceCard className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold">{t("customer.usage.quotaCardTitle")}</h3>
                  <StatusBadge tone={subscriptionStatusTone(sub.status)}>
                    {t(`customer.status.${sub.status}`, sub.status)}
                  </StatusBadge>
                </div>

                <dl className="mt-5 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">{t("customer.usage.billingPeriod")}</dt>
                    <dd className="font-medium">
                      {formatDateTime(sub.currentPeriodStart)} →{" "}
                      {formatDateTime(sub.currentPeriodEnd)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("customer.usage.plan")}</dt>
                    <dd className="font-medium">{sub.planName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("customer.usage.rpmLimit")}</dt>
                    <dd className="font-medium">
                      {sub.requestsPerMinute} / min
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({t("customer.usage.rpmShort")})
                      </span>
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 grid gap-6 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t("customer.usage.requestsUsed")}
                    </p>
                    <p className="mt-1 text-2xl font-bold">{formatInt(data.requestsUsed)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t("customer.usage.monthlyQuota")}
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {data.monthlyLimit === null ? "—" : formatInt(data.monthlyLimit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t("customer.usage.remaining")}
                    </p>
                    <p className={`mt-1 text-2xl font-bold ${exhausted ? "text-destructive" : ""}`}>
                      {data.requestsRemaining === null ? "—" : formatInt(data.requestsRemaining)}
                    </p>
                  </div>
                </div>

                {pct !== null && (
                  <div className="mt-6">
                    <div
                      className="h-2.5 w-full overflow-hidden rounded-full bg-surface-high"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={t("customer.usage.quotaProgress")}
                    >
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-gold" : "bg-primary"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {pct}% · {t("customer.usage.quotaCaption")}
                    </p>
                  </div>
                )}

                {exhausted && (
                  <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {t("customer.usage.exhaustedNote", { limit: formatInt(data.monthlyLimit) })}
                  </p>
                )}
              </SurfaceCard>

              {/* Quota vs RPM explainer */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex gap-3 rounded-xl border border-border/60 p-4 text-sm">
                  <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold">{t("customer.usage.quotaExplainerTitle")}</p>
                    <p className="text-muted-foreground">
                      {t("customer.usage.quotaExplainerBody")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 rounded-xl border border-border/60 p-4 text-sm">
                  <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold">{t("customer.usage.rpmExplainerTitle")}</p>
                    <p className="text-muted-foreground">{t("customer.usage.rpmExplainerBody")}</p>
                  </div>
                </div>
              </div>

              {/* Per-key breakdown */}
              <SurfaceCard>
                <div className="border-b border-border/60 px-6 py-4">
                  <h3 className="font-semibold">{t("customer.usage.keysTitle")}</h3>
                </div>
                {data.keys.length === 0 ? (
                  <EmptyState
                    title={t("customer.usage.noKeysTitle")}
                    message={t("customer.usage.noKeysMessage")}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("customer.apiKeys.colName")}</TableHead>
                        <TableHead>{t("customer.apiKeys.colPrefix")}</TableHead>
                        <TableHead>{t("customer.usage.colRequests")}</TableHead>
                        <TableHead>{t("customer.apiKeys.colLastUsed")}</TableHead>
                        <TableHead className="text-right">
                          {t("customer.apiKeys.colActions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.keys.map((key) => (
                        <TableRow key={key.id}>
                          <TableCell className="font-medium">{key.name}</TableCell>
                          <TableCell>
                            <code className="rounded bg-surface-low px-2 py-1 font-mono text-xs">
                              {key.keyPrefix}…
                            </code>
                          </TableCell>
                          <TableCell>{formatInt(key.requestsUsed)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {key.lastUsedAt
                              ? formatDateTime(key.lastUsedAt)
                              : t("customer.apiKeys.neverUsed")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedKeyId(key.id)}
                            >
                              <Eye className="size-3.5" />
                              {t("customer.usage.keyDetailAction")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </SurfaceCard>
            </>
          );
        })()
      )}

      {/* Per-key drill-down — data comes from GET /customer/usage/:id */}
      <Dialog
        open={selectedKeyId !== null}
        onOpenChange={(open) => !open && setSelectedKeyId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("customer.usage.keyDetailTitle")}</DialogTitle>
            <DialogDescription>{t("customer.usage.keyDetailDescription")}</DialogDescription>
          </DialogHeader>
          {keyUsage.isError ? (
            <ErrorState
              message={keyUsage.error instanceof Error ? keyUsage.error.message : undefined}
              onRetry={() => void keyUsage.refetch()}
            />
          ) : keyUsage.isLoading || !keyUsage.data ? (
            <LoadingState />
          ) : (
            <dl className="grid gap-x-6 gap-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t("customer.usage.keyDetailKey")}</dt>
                <dd className="font-mono text-xs">{keyUsage.data.key.keyPrefix}…</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t("customer.usage.requestsUsed")}</dt>
                <dd className="font-semibold">{formatInt(keyUsage.data.requestsUsed)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t("customer.usage.monthlyQuota")}</dt>
                <dd className="font-semibold">
                  {keyUsage.data.monthlyLimit === null
                    ? "—"
                    : formatInt(keyUsage.data.monthlyLimit)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t("customer.usage.remaining")}</dt>
                <dd className="font-semibold">
                  {keyUsage.data.requestsRemaining === null
                    ? "—"
                    : formatInt(keyUsage.data.requestsRemaining)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t("customer.usage.billingPeriod")}</dt>
                <dd className="text-right font-medium">
                  {keyUsage.data.currentPeriodStart
                    ? formatDateTime(keyUsage.data.currentPeriodStart)
                    : "—"}
                </dd>
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
