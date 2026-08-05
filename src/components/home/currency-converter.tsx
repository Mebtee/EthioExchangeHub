import { useState } from "react";
import { ArrowUpDown } from "lucide-react";

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
      <h3 className="text-lg font-semibold mb-4">Currency Converter</h3>
      <label
        htmlFor="converter-from"
        className="block text-xs font-semibold text-muted-foreground mb-1"
      >
        From
      </label>
      <div className="flex items-stretch gap-2 mb-2">
        <select
          id="converter-from"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-xl border border-border bg-surface-low px-3 text-sm font-semibold"
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
          className="flex-1 rounded-xl border border-border bg-surface-low px-3 py-2.5 text-sm tabular focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div className="flex justify-center my-2">
        <button
          onClick={() => {
            const t = from;
            setFrom(to);
            setTo(t);
          }}
          className="size-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90"
          aria-label="Swap"
        >
          <ArrowUpDown className="size-4" />
        </button>
      </div>
      <label
        htmlFor="converter-to"
        className="block text-xs font-semibold text-muted-foreground mb-1"
      >
        To
      </label>
      <div className="flex items-stretch gap-2 mb-3">
        <select
          id="converter-to"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-xl border border-border bg-surface-low px-3 text-sm font-semibold"
        >
          <option>ETB</option>
          {currencies.map((c) => (
            <option key={c.code}>{c.code}</option>
          ))}
        </select>
        <div className="flex-1 rounded-xl border border-border bg-surface-low px-3 py-2.5 text-sm tabular font-semibold">
          {converted}
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Using best available rate:{" "}
        <span className="font-semibold text-foreground">
          {hasRate ? bestBuyRate.toFixed(2) : "—"}
        </span>
      </p>
      <button className="mt-4 w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold hover:opacity-90 transition">
        Calculate Best Value
      </button>
    </SurfaceCard>
  );
}
