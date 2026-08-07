import { RankingRow, RANKING_GRID } from "./ranking-row";
import { EmptyState, ErrorState } from "@/components/shared/async-states";
import { TableRowsSkeleton } from "@/components/shared/skeletons";
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
  /** Selected "as of" date (YYYY-MM-DD), "" for the latest snapshot. */
  asOfDate?: string;
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
  asOfDate,
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
          <span>Rate Date</span>
          <span className="text-right">Action</span>
        </div>

        {/* Skeleton columns mirror the header: rank, bank, 4 rate fields, currency, update, action */}
        {isLoading ? (
          <TableRowsSkeleton rows={8} columns={9} />
        ) : isError ? (
          <ErrorState
            title="Unable to load exchange rates"
            message={errorMessage ?? "Something went wrong while contacting the rates service."}
            onRetry={onRetry}
          />
        ) : rankings.length === 0 ? (
          <EmptyState
            title="No exchange rates available"
            message={
              asOfDate
                ? `No bank published a rate on ${asOfDate} that matches the current selection.`
                : hasFilters
                  ? "No banks match your current search or currency selection."
                  : "No bank has published rate data yet. Rates will appear here as soon as they are collected."
            }
          />
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
