import type { LucideIcon } from "lucide-react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

const ICON_TONES = {
  primary: "bg-primary/10 text-primary",
  gold: "bg-gold-soft text-gold-foreground",
  neutral: "bg-surface-high text-muted-foreground",
  destructive: "bg-destructive/10 text-destructive",
  success: "bg-success/10 text-success",
} as const;

export function StatCard({
  label,
  value,
  delta,
  direction,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  delta?: string;
  direction?: "up" | "down" | "neutral";
  icon: LucideIcon;
  tone?: keyof typeof ICON_TONES;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            ICON_TONES[tone],
          )}
        >
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold tabular tracking-tight">{value}</p>
      {delta && (
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
          {direction === "up" && <TrendingUp className="size-3.5 text-success" />}
          {direction === "down" && <TrendingDown className="size-3.5 text-destructive" />}
          {direction === "neutral" && <Minus className="size-3.5" />}
          {delta}
        </p>
      )}
    </div>
  );
}
