import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function SurfaceCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-card border border-border/60 shadow-[0_4px_16px_rgba(0,0,0,0.04)]",
        className,
      )}
      {...props}
    />
  );
}
