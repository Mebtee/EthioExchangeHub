import { useMemo, useState } from "react";

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
        <h1 className="text-3xl font-bold tracking-tight">Scrape Logs</h1>
        <p className="mt-1 text-muted-foreground">Execution history for every bank scraper run.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          type="text"
          value={query}
          onChange={setQuery}
          placeholder="Search run id or bank..."
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
              {s === "ALL" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
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
          emptyTitle="No logs match your filters"
          emptyMessage="Try clearing the search or switching the status filter."
          footer={`Showing ${filtered.length} of ${logs.length} log entries`}
          columns={[
            {
              key: "ranAt",
              header: "Time",
              cell: (log) => (
                <span className="whitespace-nowrap tabular">
                  {formatRelativeTime(log.ranAt ?? "")}
                </span>
              ),
            },
            {
              key: "runId",
              header: "Run",
              cell: (log) => <span className="font-medium">{log.runId.slice(0, 8)}…</span>,
            },
            {
              key: "bank",
              header: "Bank",
              cell: (log) => <span className="text-muted-foreground">{log.bankName}</span>,
            },
            {
              key: "status",
              header: "Status",
              cell: (log) => (
                <StatusBadge tone={logStatusTone(log.status)}>{log.status}</StatusBadge>
              ),
            },
            {
              key: "records",
              header: "Records",
              cell: (log) => <span className="tabular">{formatCountOrDash(log.records)}</span>,
            },
            {
              key: "duration",
              header: "Duration",
              cell: (log) => <span className="tabular">{formatDurationMs(log.durationMs)}</span>,
            },
            {
              key: "message",
              header: "Message",
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
