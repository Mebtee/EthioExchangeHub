import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { BankAvatar } from "@/components/shared/bank-avatar";
import { EmptyState, ErrorState } from "@/components/shared/async-states";
import { TableRowsSkeleton } from "@/components/shared/skeletons";
import { SurfaceCard } from "@/components/shared/surface-card";
import { slugifyBankName, sourceLabel } from "@/lib/bank";
import { getCurrencyOptions } from "@/lib/rankings";
import { PREFERRED_TABS } from "@/mocks/currencies";
import type { ExchangeRate } from "@/types/exchange-rate";

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
    const preferred = PREFERRED_TABS.filter((c) => available.includes(c));
    return preferred.length > 0 ? preferred : available;
  }, [available]);

  const [selected, setSelected] = useState<string>("");
  const currency = tabs.includes(selected) ? selected : (tabs[0] ?? "");

  const top5 = useMemo(
    () =>
      rates
        .filter((r) => r.currency === currency)
        .filter((r) => Number.isFinite(r.cashBuying))
        .sort((a, b) => b.cashBuying - a.cashBuying)
        .slice(0, 5),
    [rates, currency],
  );

  const reportingBanks = useMemo(() => new Set(rates.map((r) => r.bankName)).size, [rates]);

  return (
    <SurfaceCard className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-semibold">Live Bank Rankings</h2>
          <p className="text-sm text-muted-foreground">
            Top 5 institutions by {currency || "market"} performance
          </p>
        </div>
        {tabs.length > 0 && (
          <div className="bg-surface-high rounded-xl p-1 flex">
            {tabs.map((c) => (
              <button
                key={c}
                onClick={() => setSelected(c)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
                  currency === c ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <TableRowsSkeleton rows={5} columns={3} />
      ) : isError ? (
        <ErrorState
          title="Unable to load exchange rates"
          message={errorMessage ?? "Something went wrong while contacting the rates service."}
          onRetry={onRetry}
        />
      ) : top5.length === 0 ? (
        <EmptyState
          title="No exchange rates available"
          message="No bank has published rate data yet. Rates will appear here as soon as they are collected."
        />
      ) : (
        <>
          <div className="grid grid-cols-[1fr_90px_90px_60px] gap-4 px-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            <span>Bank Entity</span>
            <span className="text-right">Buying</span>
            <span className="text-right">Selling</span>
            <span className="text-right">Trend</span>
          </div>
          <ul className="mt-2 divide-y divide-border/60">
            {top5.map((item, i) => (
              <li
                key={item.id}
                className="grid grid-cols-[1fr_90px_90px_60px] items-center gap-4 px-2 py-4 hover:bg-surface-low rounded-lg transition"
              >
                <Link
                  to={`/banks/${item.bankCode ?? slugifyBankName(item.bankName)}`}
                  className="flex items-center gap-3 min-w-0"
                >
                  <BankAvatar
                    name={item.bankName}
                    logo={item.logo}
                    className="size-9 rounded-full text-[11px]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold truncate">{item.bankName}</span>
                    <span className="block text-xs text-muted-foreground">
                      {sourceLabel(item.source)}
                    </span>
                  </span>
                </Link>
                <span
                  className={`text-right tabular text-sm font-semibold ${i === 0 ? "text-primary" : ""}`}
                >
                  {item.cashBuying.toFixed(2)}
                </span>
                <span className="text-right tabular text-sm font-semibold">
                  {item.cashSelling.toFixed(2)}
                </span>
                <span className="text-right text-sm font-semibold text-muted-foreground">—</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 text-center border-t border-border/60 pt-4">
            <Link
              to="/banks"
              className="text-sm font-semibold text-primary hover:underline tracking-wider"
            >
              VIEW ALL {reportingBanks}+ BANKS
            </Link>
          </div>
        </>
      )}
    </SurfaceCard>
  );
}
