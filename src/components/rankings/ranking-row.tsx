import { memo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { BankAvatar } from "@/components/shared/bank-avatar";
import { RATE_FIELDS } from "@/lib/rankings";
import { slugifyBankName } from "@/lib/bank";
import { formatRateDate, formatRateOrDash } from "@/lib/format";
import { useLocale } from "@/hooks";
import type { RankedExchangeRate, RateField } from "@/types/exchange-rate";

export const RANKING_GRID = "grid-cols-[60px_1.5fr_1fr_1fr_1fr_1fr_0.8fr_0.9fr_100px]";

export const RankingRow = memo(function RankingRow({
  item,
  field,
}: {
  item: RankedExchangeRate;
  field: RateField;
}) {
  const { t } = useTranslation();
  const { localize } = useLocale();
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
      </span>{" "}
      <div className="flex items-center gap-3 min-w-0">
        <BankAvatar name={item.bankName} logo={item.logo} className="size-10 rounded-full" />
        <div className="min-w-0">
          <p className="font-semibold truncate flex items-center gap-2">
            {item.bankName}
            {item.stale && (
              <span className="shrink-0 rounded-md bg-[color:var(--gold-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--gold-foreground)] uppercase tracking-wider">
                {t("common.stale")}
              </span>
            )}
          </p>
        </div>
      </div>
      {RATE_FIELDS.map((f) => {
        const active = f.key === field;
        const display = formatRateOrDash(item[f.key]);
        return (
          <div
            key={f.key}
            className={`tabular font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}
          >
            {display}
            {isTop && active && (
              <span className="ml-2 inline-block rounded-md bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5 uppercase tracking-wider">
                {t("common.best")}
              </span>
            )}
          </div>
        );
      })}
      <div className="text-sm font-semibold text-muted-foreground">{item.currency}</div>
      <span className="text-sm text-muted-foreground">{formatRateDate(item.rateDate)}</span>
      <Link
        to={localize(`/banks/${item.bankCode ?? slugifyBankName(item.bankName)}`)}
        className="ml-auto rounded-lg bg-surface-high px-4 py-2 text-xs font-semibold hover:bg-surface-high/80"
      >
        {t("common.details")}
      </Link>
    </li>
  );
});
