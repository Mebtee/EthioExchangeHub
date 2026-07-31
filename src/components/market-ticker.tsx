import { TrendingDown, TrendingUp } from "lucide-react";
import { marketTicker } from "@/lib/demo-data";

export function MarketTicker() {
  const items = [...marketTicker, ...marketTicker, ...marketTicker];
  return (
    <div className="overflow-hidden bg-foreground text-background border-y border-border/40">
      <div className="flex gap-12 py-3 animate-[ee-marquee_40s_linear_infinite] whitespace-nowrap">
        {items.map((t, i) => {
          const up = t.change >= 0;
          return (
            <div key={i} className="flex items-center gap-2 text-sm font-medium tabular pl-12">
              <span className="text-background/70">{t.pair}</span>
              <span className="font-semibold">{t.value.toFixed(2)}</span>
              <span className={up ? "text-emerald-400 inline-flex items-center gap-1" : "text-red-400 inline-flex items-center gap-1"}>
                {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                {Math.abs(t.change).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes ee-marquee { from { transform: translateX(0)} to { transform: translateX(-33.333%)}}`}</style>
    </div>
  );
}