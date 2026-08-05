import { useMemo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useMarketTicker } from "@/hooks";

export function MarketTicker() {
  const { data = [] } = useMarketTicker();

  // Tripled for a seamless loop; memoized so the marquee doesn't rebuild each render.
  const items = useMemo(() => [...data, ...data, ...data], [data]);

  return (
    <div
      className="overflow-hidden bg-foreground text-background border-y border-border/40"
      aria-hidden="true"
    >
      <div className="flex gap-12 py-3 animate-[ee-marquee_40s_linear_infinite] whitespace-nowrap ee-marquee">
        {items.map((t, i) => {
          const up = t.change >= 0;
          return (
            <div
              key={`${t.pair}-${i}`}
              className="flex items-center gap-2 text-sm font-medium tabular pl-12"
            >
              <span className="text-background/70">{t.pair}</span>
              <span className="font-semibold">{t.value.toFixed(2)}</span>
              <span
                className={
                  up
                    ? "text-emerald-400 inline-flex items-center gap-1"
                    : "text-red-400 inline-flex items-center gap-1"
                }
              >
                {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                {Math.abs(t.change).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
