import { useMemo, useState } from "react";

import { DataTable } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { SearchInput } from "@/components/shared/search-input";
import { SurfaceCard } from "@/components/shared/surface-card";
import { useMockFetch } from "@/hooks/use-mock-fetch";
import { SCRAPE_LOGS, type LogStatus, type ScrapeLog } from "@/lib/admin/mock-data";
import { formatAmount, formatRelativeTime } from "@/lib/format";

const STATUS_FILTERS: Array<"ALL" | LogStatus> = ["ALL", "success", "warning", "error"];

function logTone(status: LogStatus) {
  if (status === "success") return "success" as const;
  if (status === "warning") return "warning" as const;
  return "danger" as const;
}

export default function AdminScrapeLogsPage() {
  const { data, isLoading } = useMockFetch(() => SCRAPE_LOGS);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | LogStatus>("ALL");

  const logs = data ?? SCRAPE_LOGS;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesStatus = status === "ALL" ? true : log.status === status;
      const matchesQuery = q
        ? log.scraper.toLowerCase().includes(q) || log.bank.toLowerCase().includes(q)
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
          placeholder="Search scraper or bank..."
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
          emptyTitle="No logs match your filters"
          emptyMessage="Try clearing the search or switching the status filter."
          footer={`Showing ${filtered.length} of ${logs.length} log entries`}
          columns={[
            {
              key: "timestamp",
              header: "Time",
              cell: (log) => (
                <span className="whitespace-nowrap tabular">
                  {formatRelativeTime(log.timestamp)}
                </span>
              ),
            },
            {
              key: "scraper",
              header: "Scraper",
              cell: (log) => <span className="font-medium">{log.scraper}</span>,
            },
            {
              key: "bank",
              header: "Bank",
              cell: (log) => <span className="text-muted-foreground">{log.bank}</span>,
            },
            {
              key: "status",
              header: "Status",
              cell: (log) => <StatusBadge tone={logTone(log.status)}>{log.status}</StatusBadge>,
            },
            {
              key: "records",
              header: "Records",
              cell: (log) => (
                <span className="tabular">{log.records > 0 ? formatAmount(log.records) : "—"}</span>
              ),
            },
            {
              key: "duration",
              header: "Duration",
              cell: (log) => (
                <span className="tabular">
                  {log.durationMs > 0 ? `${(log.durationMs / 1000).toFixed(1)}s` : "—"}
                </span>
              ),
            },
            {
              key: "message",
              header: "Message",
              cell: (log) => (
                <span
                  className="block max-w-[260px] truncate text-muted-foreground"
                  title={log.message}
                >
                  {log.message}
                </span>
              ),
            },
          ]}
        />
      </SurfaceCard>
    </div>
  );
}
