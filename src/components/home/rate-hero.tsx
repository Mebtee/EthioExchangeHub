import type { ReactNode } from "react";
import { useTranslation, Trans } from "react-i18next";

export function RateHero({
  icon,
  label,
  rate,
  currency,
  bank,
  accent,
  stale,
}: {
  icon: ReactNode;
  label: string;
  rate?: number;
  currency: string;
  bank: string;
  accent: "primary" | "gold";
  /** When true, the shown rate is older than the backend staleness window (D2). */
  stale?: boolean;
}) {
  const { t } = useTranslation();
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
          {typeof rate === "number" && Number.isFinite(rate) ? (
            <>
              {rate.toFixed(2)}{" "}
              <span className="text-sm text-muted-foreground font-medium">{currency}</span>
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          <Trans
            i18nKey="rateHero.availableAt"
            values={{ bank }}
            components={{ bank: <span className={`font-semibold ${labelColor}`} /> }}
          />
        </p>
        {stale && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[color:var(--gold-soft)] px-2 py-1 text-[11px] font-semibold text-[color:var(--gold-foreground)]">
            {t("rateHero.staleMessage")}
          </p>
        )}
      </div>
      <div className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${labelColor}`}>
        {label}
      </div>
    </div>
  );
}
