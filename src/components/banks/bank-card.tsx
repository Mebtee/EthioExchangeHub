import { memo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import { BankAvatar } from "@/components/shared/bank-avatar";
import { formatRelativeTime } from "@/lib/format";
import type { Bank } from "@/types/bank";
import type { ExchangeRate } from "@/types/exchange-rate";

export const BankCard = memo(function BankCard({ bank, rate }: { bank: Bank; rate: ExchangeRate }) {
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
        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Updated {formatRelativeTime(rate.lastUpdated)}
          </span>
          <span className="inline-flex items-center text-primary font-semibold">
            View details <ChevronRight className="size-3.5" />
          </span>
        </div>
      </Link>
    </li>
  );
});
