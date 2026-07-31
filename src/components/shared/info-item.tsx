import type { ReactNode } from "react";

interface InfoItemProps {
  icon: ReactNode;
  label: string;
  value: string;
  variant?: "row" | "card";
}

export function InfoItem({ icon, label, value, variant = "row" }: InfoItemProps) {
  if (variant === "card") {
    return (
      <div className="rounded-2xl bg-card border border-border/60 p-5 flex items-start gap-4">
        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {label}
          </p>
          <p className="text-sm font-semibold mt-1">{value}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
