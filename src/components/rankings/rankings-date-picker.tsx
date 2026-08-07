import { CalendarDays, X } from "lucide-react";

import { useRateDateRange } from "@/hooks/use-rate-date-range";
import { cn } from "@/lib/utils";

interface RankingsDatePickerProps {
  /** Selected "as of" date (YYYY-MM-DD) or "" for the latest snapshot. */
  value: string;
  onDateChange: (value: string) => void;
}

/**
 * Bounded calendar for the rankings page. `min`/`max` come from the actual
 * rate_date range across all published rates, so users can only pick dates
 * that exist in the data. When no data exists the picker is disabled.
 */
export function RankingsDatePicker({ value, onDateChange }: RankingsDatePickerProps) {
  const { data: range, isLoading } = useRateDateRange();
  const hasData = Boolean(range?.min && range?.max);
  const disabled = isLoading || !hasData;

  return (
    <label className="flex items-center gap-2">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        As of
      </span>
      <div className="relative">
        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="date"
          value={value}
          min={range?.min ?? undefined}
          max={range?.max ?? undefined}
          disabled={disabled}
          onChange={(e) => onDateChange(e.target.value)}
          className={cn(
            "rounded-xl bg-card border border-border pl-9 pr-8 py-2.5 text-sm font-semibold",
            "focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60",
          )}
        />
        {value && (
          <button
            type="button"
            aria-label="Clear date filter"
            onClick={() => onDateChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground hover:text-foreground hover:bg-surface-high"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </label>
  );
}
