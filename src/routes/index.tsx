import { Link } from "react-router-dom";
import {
  ShoppingCart,
  Tag,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpDown,
  RefreshCw,
  Newspaper,
} from "lucide-react";
import { useMemo, useState } from "react";
import { SiteShell, PageContainer } from "@/components/site-shell";
import { MarketTicker } from "@/components/market-ticker";
import { banks, news, currencies } from "@/lib/demo-data";


function Index() {
  const [currency, setCurrency] = useState<"USD" | "EUR" | "GBP">("USD");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("ETB");
  const [amount, setAmount] = useState(1000);

  const top5 = useMemo(
    () => [...banks].sort((a, b) => b.buy - a.buy).slice(0, 5),
    [],
  );
  const bestBuy = top5[0];
  const bestSell = [...banks].sort((a, b) => a.sell - b.sell)[0];

  const rate = bestBuy?.buy ?? 112.55;
  const converted = (amount * rate).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <SiteShell>
      <MarketTicker />
      <PageContainer>
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          {/* Hero */}
          <section>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">
              <span className="text-primary">Secure Your Wealth</span> with
              <br />
              <span className="text-[color:var(--gold-foreground)]">Precision Rates</span>
            </h1>
            <p className="mt-5 max-w-lg text-muted-foreground">
              Ethiopia's most trusted real-time banking aggregator. Compare official
              exchange rates from all commercial banks and maximize your currency
              value today.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/banks"
                className="inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:opacity-90 transition"
              >
                Compare Banks <TrendingUp className="size-4" />
              </Link>
              <Link
                to="/news"
                className="inline-flex items-center rounded-2xl border border-primary/40 text-primary px-6 py-3 text-sm font-semibold hover:bg-primary/5 transition"
              >
                Daily News
              </Link>
            </div>
            <p className="mt-5 text-xs text-muted-foreground flex items-center gap-2">
              <RefreshCw className="size-3" /> Last Updated:{" "}
              <span className="font-semibold text-foreground">Oct 24, 2024 — 14:30 GMT+3</span>
            </p>
          </section>

          {/* Best rate cards */}
          <section className="space-y-4">
            <RateHero
              icon={<ShoppingCart className="size-5" />}
              label="Best Buy Rate"
              rate={bestBuy.buy}
              currency={`ETB/USD`}
              bank={bestBuy.name}
              accent="primary"
            />
            <RateHero
              icon={<Tag className="size-5" />}
              label="Best Sell Rate"
              rate={bestSell.sell}
              currency="ETB/USD"
              bank={bestSell.name}
              accent="gold"
            />
          </section>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Live rankings */}
          <section className="rounded-2xl bg-card border border-border/60 p-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-semibold">Live Bank Rankings</h2>
                <p className="text-sm text-muted-foreground">Top 5 institutions by {currency} performance</p>
              </div>
              <div className="bg-surface-high rounded-xl p-1 flex">
                {(["USD", "EUR", "GBP"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
                      currency === c
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-[1fr_90px_90px_60px] gap-4 px-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <span>Bank Entity</span>
              <span className="text-right">Buying</span>
              <span className="text-right">Selling</span>
              <span className="text-right">Trend</span>
            </div>
            <ul className="mt-2 divide-y divide-border/60">
              {top5.map((b, i) => (
                <li
                  key={b.slug}
                  className="grid grid-cols-[1fr_90px_90px_60px] items-center gap-4 px-2 py-4 hover:bg-surface-low rounded-lg transition"
                >
                  <Link to={`/banks/${b.slug}`} className="flex items-center gap-3 min-w-0">
                    <span className={`size-9 rounded-full text-white text-[11px] font-bold flex items-center justify-center ${b.color}`}>
                      {b.short}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold truncate">{b.name}</span>
                      <span className="block text-xs text-muted-foreground">{b.type}</span>
                    </span>
                  </Link>
                  <span className={`text-right tabular text-sm font-semibold ${i === 0 ? "text-primary" : ""}`}>{b.buy.toFixed(2)}</span>
                  <span className="text-right tabular text-sm font-semibold">{b.sell.toFixed(2)}</span>
                  <span className="text-right">
                    <TrendIcon value={b.trend} />
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 text-center border-t border-border/60 pt-4">
              <Link to="/banks" className="text-sm font-semibold text-primary hover:underline tracking-wider">
                VIEW ALL {banks.length}+ BANKS
              </Link>
            </div>
          </section>

          {/* Currency converter */}
          <section className="space-y-6">
            <div className="rounded-2xl bg-card border border-border/60 p-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
              <h3 className="text-lg font-semibold mb-4">Currency Converter</h3>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">From</label>
              <div className="flex items-stretch gap-2 mb-2">
                <select
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="rounded-xl border border-border bg-surface-low px-3 text-sm font-semibold"
                >
                  {currencies.map((c) => <option key={c.code}>{c.code}</option>)}
                </select>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="flex-1 rounded-xl border border-border bg-surface-low px-3 py-2.5 text-sm tabular focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex justify-center my-2">
                <button
                  onClick={() => { const t = from; setFrom(to); setTo(t); }}
                  className="size-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90"
                  aria-label="Swap"
                >
                  <ArrowUpDown className="size-4" />
                </button>
              </div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">To</label>
              <div className="flex items-stretch gap-2 mb-3">
                <select
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="rounded-xl border border-border bg-surface-low px-3 text-sm font-semibold"
                >
                  <option>ETB</option>
                  {currencies.map((c) => <option key={c.code}>{c.code}</option>)}
                </select>
                <div className="flex-1 rounded-xl border border-border bg-surface-low px-3 py-2.5 text-sm tabular font-semibold">
                  {converted}
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Using best available rate: <span className="font-semibold text-foreground">{rate.toFixed(2)}</span>
              </p>
              <button className="mt-4 w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold hover:opacity-90 transition">
                Calculate Best Value
              </button>
            </div>

            <div className="rounded-2xl bg-card border border-border/60 p-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Financial News</h3>
                <Link to="/news" className="text-xs font-semibold text-primary hover:underline">See all</Link>
              </div>
              <ul className="space-y-4">
                {news.slice(0, 2).map((n) => (
                  <li key={n.id} className="flex gap-3">
                    <img src={n.image} alt="" className="size-14 rounded-lg object-cover flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold leading-snug line-clamp-2">{n.title}</p>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">
                        {n.date} • {n.readMinutes} min read
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </PageContainer>
    </SiteShell>
  );
}

function RateHero({
  icon,
  label,
  rate,
  currency,
  bank,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  rate: number;
  currency: string;
  bank: string;
  accent: "primary" | "gold";
}) {
  const border = accent === "primary" ? "border-l-primary" : "border-l-[color:var(--gold)]";
  const labelColor = accent === "primary" ? "text-primary" : "text-[color:var(--gold-foreground)]";
  return (
    <div className={`rounded-2xl bg-card border border-border/60 border-l-4 ${border} p-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex items-start justify-between gap-4`}>
      <div>
        <div className={`size-10 rounded-full bg-surface-low flex items-center justify-center ${labelColor}`}>{icon}</div>
        <p className="mt-4 text-3xl font-bold tabular tracking-tight">
          {rate.toFixed(2)} <span className="text-sm text-muted-foreground font-medium">{currency}</span>
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Available at <span className={`font-semibold ${labelColor}`}>{bank}</span>
        </p>
      </div>
      <div className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${labelColor}`}>
        {label}
      </div>
    </div>
  );
}

function TrendIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp className="inline size-4 text-primary" />;
  if (value < 0) return <TrendingDown className="inline size-4 text-destructive" />;
  return <Minus className="inline size-4 text-muted-foreground" />;
}

export default Index;
