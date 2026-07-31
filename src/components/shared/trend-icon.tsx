import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function TrendIcon({ value, className }: { value: number; className?: string }) {
  if (value > 0) return <TrendingUp className={cn("inline size-4 text-primary", className)} />;
  if (value < 0)
    return <TrendingDown className={cn("inline size-4 text-destructive", className)} />;
  return <Minus className={cn("inline size-4 text-muted-foreground", className)} />;
}
