import { Link } from "react-router-dom";
import { Activity, Building2, Coins, ShieldCheck } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/async-states";
import { SurfaceCard } from "@/components/shared/surface-card";
import { useDashboardStats, useRateTrend } from "@/hooks/use-admin";
import { formatRelativeTime } from "@/lib/format";
import { logStatusTone } from "@/lib/status";

const STAT_ICONS = [Building2, Coins, Activity, ShieldCheck] as const;
const STAT_TONES = ["primary", "gold", "neutral", "success"] as const;

export default function AdminDashboardPage() {
  const {
    data: dashboard,
    isLoading,
    isError: statsError,
    error: statsErrorObj,
    refetch: refetchStats,
  } = useDashboardStats();
  const {
    data: trend,
    isLoading: trendLoading,
    isError: trendError,
    error: trendErrorObj,
    refetch: refetchTrend,
  } = useRateTrend();

  // The dashboard query already fetches /banks + /scrape-logs?limit=5 once and
  // shares them across the stat cards and the recent-activity feed — no
  // separate useScrapeLogs call (avoids duplicate HTTP requests).
  const stats = dashboard?.stats ?? [];
  const recentLogs = dashboard?.recentLogs ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Platform overview — scrapers, rates, and recent activity.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          View live site
        </Link>
      </div>

      {/* Stat cards */}
      {statsError ? (
        <ErrorState
          title="Unable to load dashboard statistics"
          message={statsErrorObj instanceof Error ? statsErrorObj.message : undefined}
          onRetry={() => void refetchStats()}
        />
      ) : !isLoading && stats.length === 0 ? (
        <EmptyState
          title="No dashboard statistics available"
          message="Statistics will appear here once the backend starts reporting."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat, i) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={isLoading ? "…" : stat.value}
              delta={isLoading ? undefined : stat.delta}
              direction={isLoading ? undefined : stat.direction}
              // Index into fixed visual arrays defensively so a stats list of
              // any length renders without crashing (cycles + falls back).
              icon={STAT_ICONS[i % STAT_ICONS.length] ?? Building2}
              tone={STAT_TONES[i % STAT_TONES.length] ?? "primary"}
            />
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Rate trend chart */}
        <SurfaceCard className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">USD / ETB rate trend</h2>
              <p className="text-xs text-muted-foreground">
                Cash buying vs cash selling — last 7 days
              </p>
            </div>
            <StatusBadge tone="success">Live</StatusBadge>
          </div>
          <div className="h-72">
            {trendLoading ? (
              <LoadingState label="Loading rate trend…" />
            ) : trendError ? (
              <ErrorState
                title="Unable to load rate trend"
                message={trendErrorObj instanceof Error ? trendErrorObj.message : undefined}
                onRetry={() => void refetchTrend()}
              />
            ) : (trend ?? []).length === 0 ? (
              <EmptyState
                title="No rate trend data available"
                message="The trend will appear once exchange-rate history is available."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend ?? []} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="buyFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="sellFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={["dataMin - 0.05", "dataMax + 0.05"]}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cashBuying"
                    name="Cash buying"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#buyFill)"
                  />
                  <Area
                    type="monotone"
                    dataKey="cashSelling"
                    name="Cash selling"
                    stroke="var(--gold)"
                    strokeWidth={2}
                    fill="url(#sellFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </SurfaceCard>

        {/* Recent activity */}
        <SurfaceCard className="flex flex-col">
          <div className="border-b border-border/60 px-6 py-4">
            <h2 className="font-semibold">Recent activity</h2>
          </div>
          <ul className="flex-1 divide-y divide-border/60">
            {recentLogs.map((log) => (
              <li key={log.id} className="flex items-start gap-3 px-6 py-3.5">
                <StatusBadge tone={logStatusTone(log.status)} className="mt-0.5 shrink-0">
                  {log.status}
                </StatusBadge>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{log.message ?? log.scenario}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.bankName} · {formatRelativeTime(log.ranAt ?? "")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-border/60 px-6 py-4">
            <Link
              to="/admin/scrape-logs"
              className="text-sm font-semibold text-primary hover:underline"
            >
              View all logs →
            </Link>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
