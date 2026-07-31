import { Link } from "react-router-dom";
import { Search, ChevronRight } from "lucide-react";
import { SiteShell, PageContainer } from "@/components/site-shell";
import { banks } from "@/lib/demo-data";


function BanksPage() {
  return (
    <SiteShell>
      <PageContainer>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bank Directory</h1>
            <p className="text-muted-foreground mt-1">
              {banks.length} commercial banks reporting live USD/ETB rates.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search bank name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {banks.map((b) => (
            <li key={b.slug}>
              <Link
                to={`/banks/${b.slug}`}
                className="block rounded-2xl bg-card border border-border/60 p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:border-primary/40 hover:-translate-y-0.5 transition"
              >
                <div className="flex items-center gap-3">
                  <span className={`size-11 rounded-xl text-white font-bold flex items-center justify-center ${b.color}`}>
                    {b.short}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.type}</p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-surface-low p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Buy</p>
                    <p className="font-bold tabular text-primary">{b.buy.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg bg-surface-low p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Sell</p>
                    <p className="font-bold tabular">{b.sell.toFixed(2)}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Updated {b.lastUpdate}</span>
                  <span className="inline-flex items-center text-primary font-semibold">
                    View details <ChevronRight className="size-3.5" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </PageContainer>
    </SiteShell>
  );
}

export default BanksPage;
