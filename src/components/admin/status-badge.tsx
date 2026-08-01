import { Badge } from "@/components/ui/badge";
import type { StatusTone } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const TONES: Record<StatusTone, string> = {
  success: "border-transparent bg-success/10 text-success",
  warning: "border-transparent bg-gold-soft text-gold-foreground",
  danger: "border-transparent bg-destructive/10 text-destructive",
  neutral: "border-transparent bg-surface-high text-muted-foreground",
};

export function StatusBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  return <Badge className={cn(TONES[tone], className)}>{children}</Badge>;
}
