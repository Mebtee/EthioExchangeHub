import { memo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import { BankAvatar } from "@/components/shared/bank-avatar";
import { formatEtbCompact, formatRateDate } from "@/lib/format";
import type { Bank } from "@/types/bank";
import type { ExchangeRate } from "@/types/exchange-rate";

export const BankCard = memo(function BankCard({ bank, rate }: { bank: Bank; rate: ExchangeRate }) {
  const hasFinancials =
    bank.totalAssets !== undefined ||
    bank.totalDeposits !== undefined ||
    bank.branches !== undefined ||
    bank.totalEmployees !== undefined;

  return (
    <li>
      <Link
        to={`/banks/${bank.slug}`}
        className="block rounded-2xl bg-card border border-border/60 p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:border-primary/40 hover:-translate-y-0.5 transition"
      >
        <div className="flex items-center gap-3">
          <BankAvatar
            name={bank.name}
            short={bank.short}
            colorClass={bank.color}
            logo={rate.logo}
            className="size-11 rounded-xl"
          />
          <div className="min-w-0">
            <p className="font-semibold truncate">{bank.name}</p>
            <p className="text-xs text-muted-foreground">{bank.type}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-surface-low p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Buy
            </p>
            <p className="font-bold tabular text-primary">{rate.cashBuying.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-surface-low p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Sell
            </p>
            <p className="font-bold tabular">{rate.cashSelling.toFixed(2)}</p>
          </div>
        </div>

        {hasFinancials && (
          <div className="mt-5 rounded-xl border border-border/60 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Financial Highlights
              </p>
              <span className="text-[10px] text-muted-foreground">ETB</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Total Assets
                </p>
                <p className="font-bold tabular">{formatEtbCompact(bank.totalAssets)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Total Deposits
                </p>
                <p className="font-bold tabular">{formatEtbCompact(bank.totalDeposits)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Branches
                </p>
                <p className="font-bold tabular">{formatEtbCompact(bank.branches)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Employees
                </p>
                <p className="font-bold tabular">{formatEtbCompact(bank.totalEmployees)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Rate date {formatRateDate(rate.rateDate)}</span>
          <span className="inline-flex items-center text-primary font-semibold">
            View details <ChevronRight className="size-3.5" />
          </span>
        </div>
      </Link>
    </li>
  );
});
