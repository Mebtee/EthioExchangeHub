import type { ReactNode } from "react";

export function RateHero({
  icon,
  label,
  rate,
  currency,
  bank,
  accent,
}: {
  icon: ReactNode;
  label: string;
  rate: number;
  currency: string;
  bank: string;
  accent: "primary" | "gold";
}) {
  const border = accent === "primary" ? "border-l-primary" : "border-l-[color:var(--gold)]";
  const labelColor = accent === "primary" ? "text-primary" : "text-[color:var(--gold-foreground)]";
  return (
    <div
      className={`rounded-2xl bg-card border border-border/60 border-l-4 ${border} p-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex items-start justify-between gap-4`}
    >
      <div>
        <div
          className={`size-10 rounded-full bg-surface-low flex items-center justify-center ${labelColor}`}
        >
          {icon}
        </div>
        <p className="mt-4 text-3xl font-bold tabular tracking-tight">
          {rate.toFixed(2)}{" "}
          <span className="text-sm text-muted-foreground font-medium">{currency}</span>
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Available at <span className={`font-semibold ${labelColor}`}>{bank}</span>
        </p>
      </div>
      <div className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${labelColor}`}>
        {label}
      </div>
    </div>
  );
}
