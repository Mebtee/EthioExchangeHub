import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import {
  BadgeCheck,
  Clock,
  Download,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Smartphone,
  Lightbulb,
} from "lucide-react";
import { SiteShell, PageContainer } from "@/components/site-shell";
import { banks, currencies } from "@/lib/demo-data";

function BankDetails() {
  const { slug } = useParams<{ slug: string }>();
  const bank = banks.find((b) => b.slug === slug);
  if (!bank) {
    return (
      <SiteShell>
        <PageContainer>
          <h1 className="text-2xl font-bold">Bank not found</h1>
          <Link to="/banks" className="text-primary hover:underline">Back to banks</Link>
        </PageContainer>
      </SiteShell>
    );
  }

  const fxRows = currencies.map((c, i) => {
    const variance = (i - 1) * 0.04;
    return {
      ...c,
      buy: (bank.buy / (i === 0 ? 1 : 1.78 + i)).toFixed(4),
      sell: (bank.sell / (i === 0 ? 1 : 1.78 + i)).toFixed(4),
      trend: variance,
    };
  });

  return (
    <SiteShell>
      <PageContainer>
        {/* Header card */}
        <div className="rounded-2xl bg-card border border-border/60 shadow-[0_4px_16px_rgba(0,0,0,0.04)] p-6 flex flex-col md:flex-row gap-6">
          <div className={`size-32 rounded-xl ${bank.color} text-white flex items-center justify-center font-bold text-3xl flex-shrink-0`}>
            {bank.short}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{bank.name}</h1>
              <span className="rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
                Premium Member
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground max-w-3xl">{bank.description}</p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <Chip icon={<BadgeCheck className="size-4 text-primary" />}>Verified NBE Rates</Chip>
              <Chip icon={<Clock className="size-4 text-muted-foreground" />}>Updated {bank.lastUpdate}</Chip>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* FX rates table */}
          <section className="rounded-2xl bg-card border border-border/60 shadow-[0_4px_16px_rgba(0,0,0,0.04)] p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Foreign Exchange Rates</h2>
              <button className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                <Download className="size-4" /> CSV Export
              </button>
            </div>
            <div className="grid grid-cols-[1.2fr_1fr_1fr_90px] gap-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <span>Currency</span>
              <span className="text-right">Buy (ETB)</span>
              <span className="text-right">Sell (ETB)</span>
              <span className="text-right">24h</span>
            </div>
            <ul className="mt-2 divide-y divide-border/60">
              {fxRows.map((r) => (
                <li key={r.code} className="grid grid-cols-[1.2fr_1fr_1fr_90px] items-center gap-2 px-3 py-4">
                  <div className="flex items-center gap-3">
                    <span className="size-9 rounded bg-surface-high text-[11px] font-bold flex items-center justify-center">{r.code}</span>
                    <div>
                      <p className="font-semibold text-sm">{r.label}</p>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{r.category}</p>
                    </div>
                  </div>
                  <span className="text-right tabular font-semibold">{r.buy}</span>
                  <span className="text-right tabular font-semibold">{r.sell}</span>
                  <span className="text-right text-sm font-semibold inline-flex items-center justify-end gap-1">
                    {r.trend > 0 ? <TrendingUp className="size-3.5 text-primary" /> : r.trend < 0 ? <TrendingDown className="size-3.5 text-destructive" /> : <Minus className="size-3.5 text-muted-foreground" />}
                    <span className={r.trend > 0 ? "text-primary" : r.trend < 0 ? "text-destructive" : "text-muted-foreground"}>
                      {(Math.abs(r.trend)).toFixed(2)}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Contact + rating */}
          <section className="space-y-6">
            <div className="rounded-2xl bg-card border border-border/60 p-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
              <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
              <ContactRow icon={<Phone className="size-4 text-primary" />} label="Customer Support" value={bank.phone ?? "—"} />
              <ContactRow icon={<Mail className="size-4 text-primary" />} label="Email Address" value={bank.email ?? "—"} />
              <ContactRow icon={<MapPin className="size-4 text-primary" />} label="Headquarters" value={bank.hq ?? "—"} />
              <button className="mt-5 w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold">Visit Official Website</button>
            </div>

            <div className="rounded-2xl bg-card border border-border/60 p-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
              <h3 className="text-lg font-semibold">User Rating Summary</h3>
              <div className="flex items-end gap-3 mt-3">
                <span className="text-4xl font-bold tabular text-[color:var(--gold-foreground)]">{bank.rating?.toFixed(1)}</span>
                <div>
                  <div className="flex text-[color:var(--gold)]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`size-4 ${i < Math.round(bank.rating ?? 0) ? "fill-current" : ""}`} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Based on {bank.reviews?.toLocaleString()} reviews</p>
                </div>
              </div>
              <button className="mt-5 w-full rounded-xl border border-primary/40 text-primary py-2.5 text-sm font-semibold hover:bg-primary/5">
                Write a Review
              </button>
            </div>

            <div className="rounded-2xl bg-[color:var(--gold-soft)] border border-[color:var(--gold)]/30 p-5">
              <div className="flex items-center gap-2 text-[color:var(--gold-foreground)] font-semibold text-sm">
                <Lightbulb className="size-4" /> Pro Tip
              </div>
              <p className="text-sm text-[color:var(--gold-foreground)]/80 mt-2">
                Check rates during market opening hours (GMT+3) for the most accurate and real-time execution prices.
              </p>
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-2xl bg-card border border-border/60 p-6 shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Branch Locations</h3>
              <Link to="/banks" className="text-sm font-semibold text-primary hover:underline">View All</Link>
            </div>
            <div className="rounded-xl h-44 bg-[linear-gradient(135deg,#e7e8e9_0%,#f3f4f5_100%)] flex items-end p-4">
              <span className="inline-flex items-center gap-2 text-xs font-semibold bg-card rounded-full px-3 py-1.5 shadow">
                <MapPin className="size-3.5 text-primary" /> {bank.branches}+ Branches Nationwide
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-primary text-primary-foreground p-6">
            <h3 className="text-lg font-semibold mb-2">Digital Banking</h3>
            <p className="text-sm text-primary-foreground/80">
              Experience seamless foreign currency applications and swift transfers via our {bank.short} mobile app.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <StoreBtn label="App Store" />
              <StoreBtn label="Google Play" />
            </div>
          </div>
        </div>
      </PageContainer>
    </SiteShell>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-surface-low border border-border/60 px-3 py-1.5 text-xs font-medium">
      {icon}{children}
    </span>
  );
}

function ContactRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">{icon}</div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function StoreBtn({ label }: { label: string }) {
  return (
    <button className="inline-flex items-center gap-2 rounded-xl bg-primary-foreground/10 border border-primary-foreground/20 px-3 py-2.5 text-sm hover:bg-primary-foreground/15 transition">
      <Smartphone className="size-4" />
      <span className="text-left">
        <span className="block text-[10px] uppercase tracking-wider opacity-80">Download on</span>
        <span className="block font-semibold">{label}</span>
      </span>
    </button>
  );
}
export default BankDetails;
