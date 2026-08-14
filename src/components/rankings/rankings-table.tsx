import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

  return (
    <section className="rounded-2xl bg-card border border-border/60 shadow-[0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="overflow-x-auto">
        <div
          className={`${RANKING_GRID} grid gap-4 px-6 py-4 bg-surface-low text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border/60 min-w-[980px]`}
        >
          <span>{t("rankings.rank")}</span>
          <span>{t("rankings.bankName")}</span>
          {RATE_FIELDS.map((f) => (
            <span key={f.key} className={f.key === field ? "text-primary" : ""}>
              {t(`rankings.shortFields.${f.key}`)} {t("rankings.etb")}
            </span>
          ))}
          <span>{t("rankings.currency")}</span>
          <span>{t("rankings.rateDate")}</span>
          <span className="text-right">{t("rankings.action")}</span>
        </div>

        {/* Skeleton columns mirror the header: rank, bank, 4 rate fields, currency, update, action */}
        {isLoading ? (
          <TableRowsSkeleton rows={8} columns={9} />
        ) : isError ? (
          <ErrorState
            title={t("rankings.unableToLoad")}
            message={errorMessage ?? t("rankings.errorMessage")}
            onRetry={onRetry}
          />
        ) : rankings.length === 0 ? (
          <EmptyState
            title={t("rankings.noRatesTitle")}
            message={
              asOfDate
                ? t("rankings.noRatesForDate", { date: asOfDate })
                : hasFilters
                  ? t("rankings.noMatch")
                  : t("rankings.noRatesYet")
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
                {t("rankings.showing", { count: rankings.length, total: totalBanks })}
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
