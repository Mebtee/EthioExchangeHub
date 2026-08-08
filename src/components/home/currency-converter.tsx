import { useState } from "react";
import { ArrowRightLeft, ArrowUpDown, Sparkles } from "lucide-react";

import { SurfaceCard } from "@/components/shared/surface-card";
import { formatAmount } from "@/lib/format";
import type { Currency } from "@/types/currency";

export function CurrencyConverter({
  currencies,
  bestBuyRate,
}: {
  currencies: Currency[];
  bestBuyRate?: number;
}) {
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("ETB");
  const [amount, setAmount] = useState(1000);

  const hasRate = typeof bestBuyRate === "number" && Number.isFinite(bestBuyRate);
  const converted = hasRate ? formatAmount(amount * bestBuyRate) : "—";

  return (
    <SurfaceCard className="p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-surface-low text-primary">
          <ArrowRightLeft className="size-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold tracking-tight">Currency Converter</h3>
          <p className="text-xs text-muted-foreground">Convert at the best available bank rate</p>
        </div>
      </div>

      <label
        htmlFor="converter-from"
        className="mb-1 block text-xs font-semibold text-muted-foreground"
      >
        From
      </label>
      <div className="mb-2 flex items-stretch gap-2">
        <select
          id="converter-from"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="min-w-[6rem] shrink-0 rounded-xl border border-border bg-surface-low px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {currencies.map((c) => (
            <option key={c.code}>{c.code}</option>
          ))}
        </select>
        <input
          type="number"
          id="converter-amount"
          aria-label="Amount to convert"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface-low px-3 py-2.5 text-sm tabular focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div className="my-2 flex justify-center">
        <button
          onClick={() => {
            const t = from;
            setFrom(to);
            setTo(t);
          }}
          className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Swap"
        >
          <ArrowUpDown className="size-4" />
        </button>
      </div>
      <label
        htmlFor="converter-to"
        className="mb-1 block text-xs font-semibold text-muted-foreground"
      >
        To
      </label>
      <div className="mb-4 flex items-stretch gap-2">
        <select
          id="converter-to"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="min-w-[6rem] shrink-0 rounded-xl border border-border bg-surface-low px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option>ETB</option>
          {currencies.map((c) => (
            <option key={c.code}>{c.code}</option>
          ))}
        </select>
        <div className="min-w-0 flex-1 rounded-xl border border-border bg-surface-low px-3 py-2 text-right text-lg font-bold tabular">
          {converted}
        </div>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Sparkles className="size-3.5 text-primary" />
        Using best available rate:{" "}
        <span className="font-semibold text-foreground">
          {hasRate ? bestBuyRate.toFixed(2) : "—"}
        </span>
      </p>
      <button className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
        Calculate Best Value
      </button>
    </SurfaceCard>
  );
}
