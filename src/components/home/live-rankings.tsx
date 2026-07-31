import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BankAvatar } from "@/components/shared/bank-avatar";
import { SurfaceCard } from "@/components/shared/surface-card";
import { TrendIcon } from "@/components/shared/trend-icon";
import type { Bank } from "@/types/bank";

const TABS = ["USD", "EUR", "GBP"] as const;

export function LiveRankings({ banks }: { banks: Bank[] }) {
  const [currency, setCurrency] = useState<(typeof TABS)[number]>("USD");

  const top5 = useMemo(() => [...banks].sort((a, b) => b.buy - a.buy).slice(0, 5), [banks]);

  return (
    <SurfaceCard className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-semibold">Live Bank Rankings</h2>
          <p className="text-sm text-muted-foreground">
            Top 5 institutions by {currency} performance
          </p>
        </div>
        <div className="bg-surface-high rounded-xl p-1 flex">
          {TABS.map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
                currency === c ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_90px_90px_60px] gap-4 px-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        <span>Bank Entity</span>
        <span className="text-right">Buying</span>
        <span className="text-right">Selling</span>
        <span className="text-right">Trend</span>
      </div>
      <ul className="mt-2 divide-y divide-border/60">
        {top5.map((b, i) => (
          <li
            key={b.slug}
            className="grid grid-cols-[1fr_90px_90px_60px] items-center gap-4 px-2 py-4 hover:bg-surface-low rounded-lg transition"
          >
            <Link to={`/banks/${b.slug}`} className="flex items-center gap-3 min-w-0">
              <BankAvatar
                name={b.name}
                short={b.short}
                colorClass={b.color}
                className="size-9 rounded-full text-[11px]"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold truncate">{b.name}</span>
                <span className="block text-xs text-muted-foreground">{b.type}</span>
              </span>
            </Link>
            <span
              className={`text-right tabular text-sm font-semibold ${i === 0 ? "text-primary" : ""}`}
            >
              {b.buy.toFixed(2)}
            </span>
            <span className="text-right tabular text-sm font-semibold">{b.sell.toFixed(2)}</span>
            <span className="text-right">
              <TrendIcon value={b.trend} />
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 text-center border-t border-border/60 pt-4">
        <Link
          to="/banks"
          className="text-sm font-semibold text-primary hover:underline tracking-wider"
        >
          VIEW ALL {banks.length}+ BANKS
        </Link>
      </div>
    </SurfaceCard>
  );
}
