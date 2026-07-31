import { Link } from "react-router-dom";
import { SurfaceCard } from "@/components/shared/surface-card";
import type { NewsItem } from "@/types/news";

export function FinancialNews({ items }: { items: NewsItem[] }) {
  return (
    <SurfaceCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Financial News</h3>
        <Link to="/news" className="text-xs font-semibold text-primary hover:underline">
          See all
        </Link>
      </div>
      <ul className="space-y-4">
        {items.slice(0, 2).map((n) => (
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
    </SurfaceCard>
  );
}
