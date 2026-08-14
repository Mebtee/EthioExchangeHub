import { Activity, CalendarClock, HeartPulse, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/async-states";
import { SurfaceCard } from "@/components/shared/surface-card";
import { useScraperHealth, useScraperHealthList } from "@/hooks/use-admin";
import { formatRelativeTime } from "@/lib/format";
import { scraperStatusTone } from "@/lib/status";

export default function AdminScraperHealthPage() {
  const { t } = useTranslation();
  const { data: summary, isLoading, isError, error, refetch } = useScraperHealth();
  const {
    data: rows,
    isLoading: rowsLoading,
    isError: rowsError,
    error: rowsErrorObj,
    refetch: refetchRows,
  } = useScraperHealthList();

  const total = summary?.total ?? 0;
  const healthy = summary?.healthy ?? 0;
  const degraded = summary?.degraded ?? 0;
  const offline = (summary?.failed ?? 0) + (summary?.unknown ?? 0);
  const stale = summary?.staleCount ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("admin.scraperHealth.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("admin.scraperHealth.intro")}</p>
      </div>

      {isError ? (
        <ErrorState
          title={t("admin.scraperHealth.errorTitle")}
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={t("admin.scraperHealth.totalScrapers")}
            value={isLoading ? "…" : String(total)}
            delta={t("admin.scraperHealth.healthyCount", { count: healthy })}
            direction="up"
            icon={Activity}
            tone="primary"
          />
          <StatCard
            label={t("admin.scraperHealth.healthy")}
            value={isLoading ? "…" : String(healthy)}
            delta={t("admin.scraperHealth.healthyDelta")}
            direction="up"
            icon={HeartPulse}
            tone="success"
          />
          <StatCard
            label={t("admin.scraperHealth.degraded")}
            value={isLoading ? "…" : String(degraded)}
            delta={t("admin.scraperHealth.degradedDelta")}
            direction="neutral"
            icon={ShieldAlert}
            tone="gold"
          />
          <StatCard
            label={t("admin.scraperHealth.offline")}
            value={isLoading ? "…" : String(offline)}
            delta={t("admin.scraperHealth.offlineDelta")}
            direction="down"
            icon={Activity}
            tone="destructive"
          />
          <StatCard
            label={t("admin.scraperHealth.staleData")}
            value={isLoading ? "…" : String(stale)}
            delta={t("admin.scraperHealth.staleDelta")}
            direction={stale > 0 ? "down" : "neutral"}
            icon={CalendarClock}
            tone={stale > 0 ? "gold" : "neutral"}
          />
        </div>
      )}

      <SurfaceCard className="p-0">
        {rowsError ? (
          <div className="p-6">
            <ErrorState
              title={t("admin.scraperHealth.rowsErrorTitle")}
              message={rowsErrorObj instanceof Error ? rowsErrorObj.message : undefined}
              onRetry={() => void refetchRows()}
            />
          </div>
        ) : rowsLoading ? (
          <div className="p-6">
            <LoadingState label={t("admin.scraperHealth.loadingRows")} />
          </div>
        ) : (rows ?? []).length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={t("admin.scraperHealth.noRowsTitle")}
              message={t("admin.scraperHealth.noRowsMessage")}
            />
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {(rows ?? []).map((row) => (
              <li
                key={row.bankCode}
                className="flex flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{row.bankName}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.bankCode} · {t("admin.scraperHealth.rateAsOf")} {row.lastRateDate ?? "—"}
                  </p>
                </div>
                <StatusBadge tone={scraperStatusTone(row.status)}>
                  {t(`admin.scraperHealth.${row.status}`)}
                </StatusBadge>
                <div className="w-32 text-right">
                  <p className="text-sm font-medium tabular">{row.responseTimeMs ?? "—"} ms</p>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.scraperHealth.responseTime")}
                  </p>
                </div>
                <div className="w-36 text-right">
                  <p className="text-sm font-medium tabular">
                    {row.consecutiveFailures === null ? "—" : `${row.consecutiveFailures}×`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.scraperHealth.consecutiveFailures")}
                  </p>
                </div>
                <div className="w-36 text-right">
                  <p className="truncate text-sm font-medium">
                    {row.lastSuccess
                      ? formatRelativeTime(row.lastSuccess)
                      : t("admin.scraperHealth.never")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.scraperHealth.lastSuccess")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SurfaceCard>
    </div>
  );
}
