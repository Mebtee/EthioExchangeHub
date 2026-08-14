import { Lightbulb, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatRate } from "@/lib/format";
import type { RankedExchangeRate, RateField } from "@/types/exchange-rate";

export function RankingsInsights({
  rankings,
  field,
  currency,
}: {
  rankings: RankedExchangeRate[];
  field: RateField;
  currency: string;
}) {
  const { t } = useTranslation();

  if (rankings.length === 0) return null;

  const label = t(`rankings.fields.${field}`);
  const top = rankings[0];
  const worst = rankings[rankings.length - 1];
  const spread = Math.abs(top.rate - worst.rate);

  return (
    <section className="mt-8 grid gap-5 md:grid-cols-3">
      <div className="md:col-span-2 rounded-2xl bg-primary/5 border border-primary/15 p-6 flex gap-4">
        <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
          <Lightbulb className="size-5" />
        </div>
        <div>
          <h3 className="font-semibold text-primary">{t("rankings.marketInsight")}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("rankings.insight", {
              count: rankings.length,
              currency,
              label,
              spread: formatRate(spread),
            })}
          </p>
        </div>
      </div>
      <div className="rounded-2xl bg-[color:var(--gold-soft)] border border-[color:var(--gold)]/30 p-6 text-center flex flex-col items-center">
        <div className="size-12 rounded-full bg-[color:var(--gold)] text-[color:var(--gold-foreground)] flex items-center justify-center mb-2">
          <Star className="size-5 fill-current" />
        </div>
        <h4 className="font-semibold text-[color:var(--gold-foreground)]">
          {t("rankings.topChoice")}
        </h4>
        <p className="text-[10px] uppercase tracking-wider text-[color:var(--gold-foreground)]/70 mb-3">
          {t("rankings.recommended", { currency, label })}
        </p>
        <p className="text-xl font-bold text-[color:var(--gold-foreground)]">{top.bankName}</p>
        <p className="text-sm font-semibold text-[color:var(--gold-foreground)]">
          {formatRate(top.rate)} ETB
        </p>
      </div>
    </section>
  );
}
