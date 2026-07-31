import { Search, ArrowRight, BadgeCheck } from "lucide-react";
import { SiteShell, PageContainer } from "@/components/site-shell";
import { news, newsCategories } from "@/lib/demo-data";


function NewsPage() {
  const featured = news.find((n) => n.featured)!;
  const rest = news.filter((n) => !n.featured);

  return (
    <SiteShell>
      <PageContainer>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Market Insights</h1>
            <p className="text-muted-foreground mt-1">Latest trends and official announcements from Ethiopia's financial sector.</p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search news and updates..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="rounded-2xl bg-card border border-border/60 p-5">
              <h3 className="font-semibold mb-3">Categories</h3>
              <ul className="space-y-1">
                {newsCategories.map((c, i) => (
                  <li key={c.name}>
                    <button className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm ${i === 0 ? "bg-primary text-primary-foreground" : "hover:bg-surface-low"}`}>
                      <span>{c.name}</span>
                      <span className={`text-xs ${i === 0 ? "opacity-90" : "text-muted-foreground"}`}>{c.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-[color:var(--gold-soft)] border border-[color:var(--gold)]/30 p-5">
              <p className="text-[10px] uppercase tracking-wider font-bold text-[color:var(--gold-foreground)] mb-1 inline-flex items-center gap-1">
                <BadgeCheck className="size-3.5" /> Official Alert
              </p>
              <h4 className="font-semibold text-[color:var(--gold-foreground)]">NBE Policy Update</h4>
              <p className="text-sm text-[color:var(--gold-foreground)]/80 mt-1">
                New directives regarding foreign currency accounts for exporters have been released.
              </p>
              <a href="#" className="mt-3 inline-flex items-center text-sm font-semibold text-[color:var(--gold-foreground)] hover:underline">
                Read Directive <ArrowRight className="size-3.5 ml-1" />
              </a>
            </div>
          </aside>

          <div>
            {/* Featured */}
            <article className="rounded-2xl bg-card border border-border/60 shadow-[0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden grid md:grid-cols-2">
              <div className="relative">
                <img src={featured.image} alt="" className="w-full h-full object-cover" />
                <span className="absolute top-4 left-4 rounded-md bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
                  Featured
                </span>
              </div>
              <div className="p-6 flex flex-col">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {featured.category} · {featured.date}
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">{featured.title}</h2>
                <p className="mt-3 text-sm text-muted-foreground">{featured.excerpt}</p>
                <div className="mt-auto pt-5 flex items-center gap-3">
                  <img src={featured.authorAvatar} alt="" className="size-10 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-semibold">{featured.author}</p>
                    <p className="text-xs text-muted-foreground">{featured.authorRole}</p>
                  </div>
                </div>
              </div>
            </article>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {rest.map((n) => (
                <article key={n.id} className="rounded-2xl bg-card border border-border/60 overflow-hidden hover:-translate-y-0.5 transition shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
                  <div className="relative">
                    <img src={n.image} alt="" className="w-full h-44 object-cover" />
                    <span className="absolute bottom-3 left-3 rounded-md bg-card/95 text-foreground text-[10px] font-semibold uppercase tracking-wider px-2 py-1">
                      {n.category}
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="text-xs text-muted-foreground">{n.date} • {n.readMinutes} min read</p>
                    <h3 className="mt-1 font-semibold leading-snug">{n.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{n.excerpt}</p>
                    <a href="#" className="mt-3 inline-flex items-center text-sm font-semibold text-primary hover:underline">
                      Read More <ArrowRight className="size-3.5 ml-1" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        {/* Newsletter */}
        <section className="mt-12 rounded-2xl bg-primary text-primary-foreground p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold">Stay ahead of the market.</h3>
            <p className="text-sm text-primary-foreground/80 max-w-md mt-1">
              Get the latest currency updates and bank rankings delivered to your inbox every morning.
            </p>
          </div>
          <form className="flex w-full md:w-auto gap-3">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 md:w-72 rounded-xl bg-primary-foreground/10 border border-primary-foreground/30 placeholder:text-primary-foreground/70 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-foreground/50"
            />
            <button className="rounded-xl bg-[color:var(--gold)] text-[color:var(--gold-foreground)] px-5 py-3 text-sm font-semibold hover:opacity-90">
              Subscribe Now
            </button>
          </form>
        </section>
      </PageContainer>
    </SiteShell>
  );
}

export default NewsPage;
