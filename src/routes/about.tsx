import { BadgeCheck, Zap, Cable, ScanSearch, BarChart3, ShieldCheck, TrendingUp, ArrowRight } from "lucide-react";
import { SiteShell, PageContainer } from "@/components/site-shell";


function AboutPage() {
  return (
    <SiteShell>
      <PageContainer>
        <div className="grid gap-10 lg:grid-cols-2 items-center">
          <div>
            <span className="inline-block rounded-full bg-[color:var(--gold-soft)] text-[color:var(--gold-foreground)] text-[10px] font-bold uppercase tracking-wider px-3 py-1.5">
              Our Mission
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold leading-[1.05]">
              Democratizing Financial <span className="text-primary">Transparency</span> in Ethiopia.
            </h1>
            <p className="mt-5 text-muted-foreground max-w-lg">
              Ethio Exchange was founded with a singular purpose: to bridge the gap between financial
              institutions and the public. We provide real-time, accurate exchange rate data to help
              individuals and businesses make informed financial decisions in a rapidly evolving market.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Pill icon={<BadgeCheck className="size-4 text-primary" />}>Certified Data</Pill>
              <Pill icon={<Zap className="size-4 text-primary" />}>Millisecond Latency</Pill>
            </div>
          </div>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1640340434855-6084b1f4901c?auto=format&fit=crop&w=1000&q=80"
              alt="Live financial dashboard"
              className="rounded-2xl object-cover w-full aspect-[4/3] shadow-[0_20px_60px_-20px_rgba(13,99,27,0.4)]"
            />
            <div className="absolute -bottom-6 left-6 rounded-2xl bg-card border border-border/60 p-4 shadow-xl w-52">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Live Updates</p>
              <p className="text-2xl font-bold text-primary leading-tight">Every 15m</p>
              <p className="text-xs text-muted-foreground">Sync with Central Bank</p>
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          <Stat label="Partner Banks" value="30+" tone="white" detail="Our system aggregates data from every major commercial bank and the National Bank of Ethiopia." />
          <Stat label="Daily Data Points" value="2,800+" tone="primary" />
          <Stat label="Historical Depth" value="5 Years" tone="gold" />
        </div>

        {/* Engineering */}
        <section className="mt-14 rounded-3xl bg-surface-low p-8 md:p-12">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary">Our Engineering</p>
            <h2 className="text-3xl font-bold mt-2">Precision Engineering &amp; Automation</h2>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            <Pipeline icon={<Cable />} title="Direct API Hooks">
              We maintain secure, direct API connections with leading financial institutions to pull raw exchange data the moment it changes at the source.
            </Pipeline>
            <Pipeline icon={<ScanSearch />} title="Advanced Web Scraping">
              For institutions without open APIs, our proprietary scrapers monitor public rate sheets 24/7, using OCR to ensure 99.9% accuracy in data translation.
            </Pipeline>
            <Pipeline icon={<BarChart3 />} title="Validation &amp; Display">
              Data is cross-referenced against historical trends and central bank benchmarks before appearing on your dashboard to eliminate anomalies.
            </Pipeline>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-bold">Built for Modern Finance</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <Feature icon={<Zap className="text-primary" />} title="Real-Time Sync">
              Experience zero-lag rate updates. As soon as a bank updates its lobby board, our platform reflects the change globally.
            </Feature>
            <Feature icon={<TrendingUp className="text-primary" />} title="Historical Trends">
              Access years of archival data to perform technical analysis and understand long-term currency fluctuations in the Ethiopian Birr.
            </Feature>
            <Feature icon={<ShieldCheck className="text-destructive" />} title="Guaranteed Accuracy">
              Our dual-verification algorithm compares multiple sources to ensure that the data you see is the absolute truth in the market.
            </Feature>
          </div>
        </section>

        <section className="mt-14 rounded-3xl bg-primary text-primary-foreground p-10 text-center">
          <h2 className="text-3xl font-bold">Ready to start trading smarter?</h2>
          <p className="mt-2 max-w-xl mx-auto text-primary-foreground/80">
            Join thousands of businesses and individuals who rely on Ethio Exchange for their daily financial intelligence.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href="/banks" className="rounded-xl bg-[color:var(--gold)] text-[color:var(--gold-foreground)] px-6 py-3 text-sm font-semibold">Explore Banks</a>
            <a href="#" className="rounded-xl border border-primary-foreground/40 px-6 py-3 text-sm font-semibold hover:bg-primary-foreground/10 inline-flex items-center gap-2">
              View API Docs <ArrowRight className="size-4" />
            </a>
          </div>
        </section>
      </PageContainer>
    </SiteShell>
  );
}

function Pill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-card border border-border/60 px-3 py-1.5 text-sm font-medium">
      {icon}{children}
    </span>
  );
}

function Stat({ label, value, tone, detail }: { label: string; value: string; tone: "white" | "primary" | "gold"; detail?: string }) {
  const cls =
    tone === "primary"
      ? "bg-primary text-primary-foreground"
      : tone === "gold"
      ? "bg-[color:var(--gold)] text-[color:var(--gold-foreground)]"
      : "bg-card border border-border/60";
  return (
    <div className={`rounded-2xl p-6 ${cls}`}>
      {detail && <p className="text-sm opacity-80 mb-3">{detail}</p>}
      <p className="text-3xl font-bold tabular">{value}</p>
      <p className="text-xs uppercase tracking-wider opacity-80 mt-1 font-semibold">{label}</p>
    </div>
  );
}

function Pipeline({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="mx-auto size-12 rounded-full bg-card border border-border/60 flex items-center justify-center text-primary">{icon}</div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 p-6">
      <div className="size-9 flex items-center justify-center">{icon}</div>
      <h3 className="mt-2 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export default AboutPage;
