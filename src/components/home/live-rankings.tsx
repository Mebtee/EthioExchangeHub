import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Trophy } from "lucide-react";

import { BankAvatar } from "@/components/shared/bank-avatar";
import { EmptyState, ErrorState } from "@/components/shared/async-states";
import { TableRowsSkeleton } from "@/components/shared/skeletons";
import { SurfaceCard } from "@/components/shared/surface-card";
import { slugifyBankName } from "@/lib/bank";
import { filterToCurrentBusinessDay, filterToLatestBusinessDay, getCurrencyOptions } from "@/lib/rankings";
import { cn } from "@/lib/utils";
import type { ExchangeRate } from "@/types/exchange-rate";

/** Preferred tab ordering (display preference only — filtered to API currencies). */
const PREFERRED_TAB_ORDER = ["USD", "EUR", "GBP"];

/** Two-decimal rate cell; an em-dash when the bank did not report that value. */
function formatRateCell(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "—";
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span
        aria-hidden
        className="flex size-7 items-center justify-center rounded-full bg-[color:var(--gold)] text-[color:var(--gold-foreground)]"
      >
        <Trophy className="size-3.5" />
      </span>
    );
  }
  if (rank <= 3) {
    return (
      <span className="flex size-7 items-center justify-center rounded-full bg-surface-high text-sm font-bold text-muted-foreground">
        {rank}
      </span>
    );
  }
  return (
    <span className="flex size-7 items-center justify-center text-sm font-semibold text-muted-foreground">
      {rank}
    </span>
  );
}

export function LiveRankings({
  rates,
  isLoading,
  isError,
  errorMessage,
  onRetry,
}: {
  rates: ExchangeRate[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
}) {
  const available = useMemo(() => getCurrencyOptions(rates), [rates]);
  const tabs = useMemo(() => {
    const preferred = PREFERRED_TAB_ORDER.filter((c) => available.includes(c));
    const rest = available.filter((c) => !PREFERRED_TAB_ORDER.includes(c));
    return [...preferred, ...rest];
  }, [available]);

  const [selected, setSelected] = useState<string>("");
  const currency = tabs.includes(selected) ? selected : (tabs[0] ?? "");

  /**
   * Ranks only rows published on the selected currency's latest business date —
   * a bank with an older rate is excluded rather than ranked as if current.
   */
  const top5 = useMemo(() => {
    const current = filterToLatestBusinessDay(rates, currency);
    return current
      .filter((r) => Number.isFinite(r.cashBuying))
      .sort((a, b) => b.cashBuying - a.cashBuying)
      .slice(0, 5);
  }, [rates, currency]);

  /** Banks with a rate on their own currency's latest business date. */
  const reportingBanks = useMemo(
    () => new Set(filterToCurrentBusinessDay(rates).map((r) => r.bankName)).size,
    [rates],
  );

  return (
    <SurfaceCard className="flex flex-col p-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Live Bank Rankings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Top banks by current exchange rate performance
        </p>
      </div>

      {tabs.length > 0 && (
        <div
          aria-label="Currency"
          role="group"
          className="mt-4 grid grid-cols-6 gap-1.5 rounded-2xl bg-surface-high/70 p-2 sm:grid-cols-8 lg:grid-cols-[repeat(12,minmax(0,1fr))]"
        >
          {tabs.map((c) => (
            <button
              key={c}
              onClick={() => setSelected(c)}
              aria-pressed={currency === c}
              className={cn(
                "flex h-8 items-center justify-center rounded-full px-1.5 text-xs font-semibold transition-colors",
                currency === c
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="mt-5">
          <TableRowsSkeleton rows={5} columns={3} />
        </div>
      ) : isError ? (
        <div className="mt-5">
          <ErrorState
            title="Unable to load exchange rates"
            message={errorMessage ?? "Something went wrong while contacting the rates service."}
            onRetry={onRetry}
          />
        </div>
      ) : top5.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="No exchange rates available"
            message="No bank has published rate data yet. Rates will appear here as soon as they are collected."
          />
        </div>
      ) : (
        <>
          <ul className="mt-5 divide-y divide-border/50">
            {top5.map((item, i) => (
              <li
                key={item.id}
                className="grid grid-cols-[28px_minmax(0,1.4fr)_repeat(4,minmax(0,1fr))] items-center gap-3 rounded-lg px-2 py-3.5 transition-colors hover:bg-surface-low/70"
              >
                <RankBadge rank={i + 1} />
                <Link
                  to={`/banks/${item.bankCode ?? slugifyBankName(item.bankName)}`}
                  className="flex min-w-0 items-center gap-3"
                >
                  <BankAvatar
                    name={item.bankName}
                    logo={item.logo}
                    className="size-9 rounded-full text-[11px]"
                  />
                  <span className="block truncate text-sm font-semibold">{item.bankName}</span>
                </Link>
                <div className="text-right">
                  <p
                    className={cn(
                      "text-sm font-bold tabular",
                      i === 0 ? "text-primary" : "text-foreground",
                    )}
                  >
                    {formatRateCell(item.cashBuying)}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Cash Buy
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular text-foreground">
                    {formatRateCell(item.cashSelling)}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Cash Sell
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular text-foreground">
                    {formatRateCell(item.transactionBuying)}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Trans. Buy
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular text-foreground">
                    {formatRateCell(item.transactionSelling)}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Trans. Sell
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-auto border-t border-border/60 pt-5">
            <Link
              to="/banks"
              className="group flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-surface-low/40 px-4 py-2.5 text-sm font-semibold text-primary transition hover:border-primary/40 hover:bg-surface-low"
            >
              View all {reportingBanks}+ banks
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </>
      )}
    </SurfaceCard>
  );
}
