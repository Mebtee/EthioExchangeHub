import { RankingRow, RANKING_GRID } from "./ranking-row";
import { RankingsEmpty, RankingsError, RankingsLoading } from "./rankings-states";
import { RATE_FIELDS } from "@/lib/rankings";
import type { RankedExchangeRate, RateField } from "@/types/exchange-rate";

interface RankingsTableProps {
  rankings: RankedExchangeRate[];
  field: RateField;
  totalBanks: number;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  hasFilters: boolean;
  onRetry: () => void;
}

export function RankingsTable({
  rankings,
  field,
  totalBanks,
  isLoading,
  isError,
  errorMessage,
  hasFilters,
  onRetry,
}: RankingsTableProps) {
  return (
    <section className="rounded-2xl bg-card border border-border/60 shadow-[0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="overflow-x-auto">
        <div
          className={`${RANKING_GRID} grid gap-4 px-6 py-4 bg-surface-low text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border/60 min-w-[980px]`}
        >
          <span>Rank</span>
          <span>Bank Name</span>
          {RATE_FIELDS.map((f) => (
            <span key={f.key} className={f.key === field ? "text-primary" : ""}>
              {f.shortLabel} (ETB)
            </span>
          ))}
          <span>Currency</span>
          <span>Last Update</span>
          <span className="text-right">Action</span>
        </div>

        {isLoading ? (
          <RankingsLoading />
        ) : isError ? (
          <RankingsError message={errorMessage} onRetry={onRetry} />
        ) : rankings.length === 0 ? (
          <RankingsEmpty hasFilters={hasFilters} />
        ) : (
          <>
            <ul className="divide-y divide-border/60">
              {rankings.map((item) => (
                <RankingRow key={item.id} item={item} field={field} />
              ))}
            </ul>
            <div className="flex items-center justify-between px-6 py-4 border-t border-border/60">
              <span className="text-sm text-muted-foreground">
                Showing 1 to {rankings.length} of {totalBanks} banks
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
