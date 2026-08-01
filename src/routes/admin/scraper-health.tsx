import { Activity, HeartPulse, RefreshCw, ShieldAlert } from "lucide-react";

import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { SurfaceCard } from "@/components/shared/surface-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useScraperHealth } from "@/hooks/use-admin";
import { formatCountOrDash, formatDurationMs, formatRelativeSchedule, formatRelativeTime } from "@/lib/format";
import { scraperStatusTone } from "@/lib/status";
import { toast } from "sonner";

export default function AdminScraperHealthPage() {
  const { data, isLoading } = useScraperHealth();
  const scrapers = data ?? [];

  const counts = {
    total: scrapers.length,
    healthy: scrapers.filter((s) => s.status === "healthy").length,
    degraded: scrapers.filter((s) => s.status === "degraded").length,
    offline: scrapers.filter((s) => s.status === "offline").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scraper Health</h1>
          <p className="mt-1 text-muted-foreground">
            Status and performance of every bank scraper.
          </p>
        </div>
        <Button variant="outline" onClick={() => toast.info("Scrape run triggered (mock)")}>
          <RefreshCw className="size-4" />
          Run all scrapers
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total scrapers"
          value={isLoading ? "…" : String(counts.total)}
          delta={`${counts.healthy} healthy`}
          direction="up"
          icon={Activity}
          tone="primary"
        />
        <StatCard
          label="Healthy"
          value={isLoading ? "…" : String(counts.healthy)}
          delta="Running normally"
          direction="up"
          icon={HeartPulse}
          tone="success"
        />
        <StatCard
          label="Degraded"
          value={isLoading ? "…" : String(counts.degraded)}
          delta="Needs attention"
          direction="neutral"
          icon={ShieldAlert}
          tone="gold"
        />
        <StatCard
          label="Offline"
          value={isLoading ? "…" : String(counts.offline)}
          delta="Not collecting"
          direction="down"
          icon={Activity}
          tone="destructive"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {scrapers.map((scraper) => (
          <SurfaceCard key={scraper.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{scraper.name}</p>
                <p className="truncate text-xs text-muted-foreground">{scraper.bank}</p>
              </div>
              <StatusBadge tone={scraperStatusTone(scraper.status)} className="shrink-0">
                {scraper.status}
              </StatusBadge>
            </div>

            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Success rate</span>
                <span className="font-semibold text-foreground">
                  {scraper.successRate > 0 ? `${scraper.successRate}%` : "—"}
                </span>
              </div>
              <Progress value={scraper.successRate} />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Last run</dt>
                <dd className="font-medium">{formatRelativeTime(scraper.lastRun)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Records</dt>
                <dd className="font-medium tabular">{formatCountOrDash(scraper.records)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Avg duration</dt>
                <dd className="font-medium tabular">{formatDurationMs(scraper.avgDurationMs)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Next run</dt>
                <dd className="font-medium">{formatRelativeSchedule(scraper.nextRun)}</dd>
              </div>
            </dl>
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
}
