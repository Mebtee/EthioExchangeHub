import { Link } from "react-router-dom";
import { Newspaper } from "lucide-react";

import { SurfaceCard } from "@/components/shared/surface-card";
import type { NewsItem } from "@/types/news";

export function FinancialNews({ items }: { items: NewsItem[] }) {
  return (
    <SurfaceCard className="p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-surface-low text-primary">
            <Newspaper className="size-4" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight">Financial News</h3>
            <p className="text-xs text-muted-foreground">Latest market updates</p>
          </div>
        </div>
        {items.length > 0 && (
          <Link to="/news" className="text-xs font-semibold text-primary hover:underline">
            See all
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">No news published yet.</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Market updates will appear here as soon as they are available.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.slice(0, 2).map((n) => (
            <li key={n.id} className="flex gap-3">
              <img
                src={n.image}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-14 flex-shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug line-clamp-2">{n.title}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  {n.date} • {n.readMinutes} min read
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SurfaceCard>
  );
}
