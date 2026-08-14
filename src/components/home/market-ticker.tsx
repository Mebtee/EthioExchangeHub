import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useExchangeRates } from "@/hooks";
import { buildMarketTicker, type MarketTickerItem } from "@/lib/market-ticker";

export function MarketTicker() {
  const { data } = useExchangeRates();
  const { t } = useTranslation();

  const items = useMemo(() => (data ? buildMarketTicker(data) : []), [data]);
  // Tripled for a seamless loop; memoized so the marquee doesn't rebuild each render.
  const marqueeItems = useMemo(() => [...items, ...items, ...items], [items]);

  if (items.length === 0) return null;

  return (
    <div
      className="overflow-hidden bg-foreground text-background border-y border-border/40"
      aria-hidden="true"
    >
      <div className="flex gap-12 py-3 animate-[ee-marquee_40s_linear_infinite] whitespace-nowrap ee-marquee">
        {marqueeItems.map((t, i) => (
          <TickerEntry key={`${t.pair}-${i}`} item={t} />
        ))}
      </div>
    </div>
  );
}

function TickerEntry({ item }: { item: MarketTickerItem }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 text-sm font-medium tabular pl-12">
      <span className="text-background/70">{item.pair}</span>
      <span className="font-semibold">
        {item.buy !== null ? item.buy.toFixed(2) : "–"}
        <span className="font-normal text-background/50">
          {" / "}
          {item.sell !== null ? item.sell.toFixed(2) : "–"}
        </span>
      </span>
      <ChangeBadge change={item.change} />
      <span
        className="text-background/50 text-xs"
        title={t("common.ratesAsOf", { date: item.rateDate })}
      >
        {formatShortDate(item.rateDate)}
      </span>
    </div>
  );
}

function ChangeBadge({ change }: { change: number | null }) {
  if (change === null) {
    return <span className="text-background/50">—</span>;
  }
  const up = change >= 0;
  return (
    <span
      className={
        up
          ? "text-emerald-400 inline-flex items-center gap-1"
          : "text-red-400 inline-flex items-center gap-1"
      }
    >
      {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
      {Math.abs(change).toFixed(2)}%
    </span>
  );
}

/** "2026-08-01" -> "08/01" (ISO-only, no Date parsing / timezone pitfalls). */
function formatShortDate(isoDate: string): string {
  return isoDate.slice(5).replace("-", "/");
}
