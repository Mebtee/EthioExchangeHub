import { Link } from "react-router-dom";
import {
  RATE_FIELDS,
  bankAccentClass,
  bankInitial,
  formatRelativeTime,
  slugifyBankName,
  sourceLabel,
} from "@/lib/rankings";
import type { RankedExchangeRate, RateField } from "@/types/exchange-rate";

export const RANKING_GRID =
  "grid-cols-[60px_1.5fr_1fr_1fr_1fr_1fr_0.8fr_0.9fr_100px]";

export function RankingRow({
  item,
  field,
}: {
  item: RankedExchangeRate;
  field: RateField;
}) {
  const isTop = item.rank === 1;

  return (
    <li
      className={`${RANKING_GRID} grid gap-4 items-center px-6 py-5 hover:bg-surface-low transition min-w-[980px]`}
    >
      <span
        className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${
          isTop
            ? "bg-[color:var(--gold)] text-[color:var(--gold-foreground)]"
            : "bg-surface-high text-foreground"
        }`}
      >
        {item.rank}
      </span>
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`size-10 rounded-full text-white font-bold flex items-center justify-center ${bankAccentClass(item.bankName)}`}
        >
          {bankInitial(item.bankName)}
        </span>
        <div className="min-w-0">
          <p className="font-semibold truncate">{item.bankName}</p>
          <p className="text-xs text-muted-foreground">
            {sourceLabel(item.source)}
          </p>
        </div>
      </div>
      {RATE_FIELDS.map((f) => {
        const active = f.key === field;
        const value = item[f.key];
        const display =
          typeof value === "number" && Number.isFinite(value)
            ? value.toFixed(4)
            : "—";
        return (
          <div
            key={f.key}
            className={`tabular font-semibold ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {display}
            {isTop && active && (
              <span className="ml-2 inline-block rounded-md bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5 uppercase tracking-wider">
                Best
              </span>
            )}
          </div>
        );
      })}
      <div className="text-sm font-semibold text-muted-foreground">
        {item.currency}
      </div>
      <span className="text-sm text-muted-foreground">
        {formatRelativeTime(item.scrapedAt)}
      </span>
      <Link
        to={`/banks/${slugifyBankName(item.bankName)}`}
        className="ml-auto rounded-lg bg-surface-high px-4 py-2 text-xs font-semibold hover:bg-surface-high/80"
      >
        Details
      </Link>
    </li>
  );
}