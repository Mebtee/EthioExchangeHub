import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { SearchInput } from "@/components/shared/search-input";
import { SurfaceCard } from "@/components/shared/surface-card";
import { useScrapeLogs } from "@/hooks/use-admin";
import type { LogStatus } from "@/types/admin";
import { formatCountOrDash, formatDurationMs, formatRelativeTime } from "@/lib/format";
import { logStatusTone } from "@/lib/status";

// D3: canonical statuses only — the backend validator rejects any other value.
const STATUS_FILTERS: Array<"ALL" | LogStatus> = ["ALL", "success", "failed"];

export default function AdminScrapeLogsPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error, refetch } = useScrapeLogs();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | LogStatus>("ALL");

  // Stable reference so the filter memo below doesn't recompute each render.
  const logs = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesStatus = status === "ALL" ? true : log.status === status;
      const matchesQuery = q
        ? log.runId.toLowerCase().includes(q) || log.bankName.toLowerCase().includes(q)
        : true;
      return matchesStatus && matchesQuery;
    });
  }, [logs, query, status]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("admin.scrapeLogs.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("admin.scrapeLogs.subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          type="text"
          value={query}
          onChange={setQuery}
          placeholder={t("admin.scrapeLogs.searchPlaceholder")}
          wrapperClassName="w-64"
        />
        <div className="inline-flex items-center gap-1 rounded-xl bg-surface-low p-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                status === s
                  ? "bg-card text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "ALL" ? t("admin.scrapeLogs.all") : t(`admin.scrapeLogs.${s}`)}
            </button>
          ))}
        </div>
      </div>

      <SurfaceCard className="overflow-hidden">
        <DataTable
          rows={filtered}
          rowKey={(log) => log.id}
          isLoading={isLoading}
          isError={isError}
          errorMessage={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
          emptyTitle={t("admin.scrapeLogs.noMatchTitle")}
          emptyMessage={t("admin.scrapeLogs.noMatchMessage")}
          footer={t("admin.scrapeLogs.showing", { count: filtered.length, total: logs.length })}
          columns={[
            {
              key: "ranAt",
              header: t("admin.scrapeLogs.time"),
              cell: (log) => (
                <span className="whitespace-nowrap tabular">
                  {formatRelativeTime(log.ranAt ?? "")}
                </span>
              ),
            },
            {
              key: "runId",
              header: t("admin.scrapeLogs.run"),
              cell: (log) => <span className="font-medium">{log.runId.slice(0, 8)}…</span>,
            },
            {
              key: "bank",
              header: t("admin.scrapeLogs.bank"),
              cell: (log) => <span className="text-muted-foreground">{log.bankName}</span>,
            },
            {
              key: "status",
              header: t("admin.scrapeLogs.status"),
              cell: (log) => (
                <StatusBadge tone={logStatusTone(log.status)}>
                  {t(`admin.scrapeLogs.${log.status}`)}
                </StatusBadge>
              ),
            },
            {
              key: "records",
              header: t("admin.scrapeLogs.records"),
              cell: (log) => <span className="tabular">{formatCountOrDash(log.records)}</span>,
            },
            {
              key: "duration",
              header: t("admin.scrapeLogs.duration"),
              cell: (log) => <span className="tabular">{formatDurationMs(log.durationMs)}</span>,
            },
            {
              key: "message",
              header: t("admin.scrapeLogs.message"),
              cell: (log) => (
                <span
                  className="block max-w-[260px] truncate text-muted-foreground"
                  title={log.message ?? ""}
                >
                  {log.message ?? log.scenario}
                </span>
              ),
            },
          ]}
        />
      </SurfaceCard>
    </div>
  );
}
