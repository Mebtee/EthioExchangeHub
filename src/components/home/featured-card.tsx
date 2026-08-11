import { Link } from "react-router-dom";
import {
  ArrowRight,
  ExternalLink,
  Gift,
  GraduationCap,
  Heart,
  Megaphone,
  Percent,
  Rocket,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { SurfaceCard } from "@/components/shared/surface-card";
import { recordFeaturedClick } from "@/lib/api/featured";
import type { ActiveFeatured, FeaturedFeature } from "@/types/featured";

/**
 * Icons referenced by name from the admin form (e.g. `graduation-cap`) map to
 * lucide components. Unknown names fall back to Sparkles so an admin typo
 * never breaks the card.
 */
const FEATURE_ICONS: Record<string, LucideIcon> = {
  "graduation-cap": GraduationCap,
  gift: Gift,
  percent: Percent,
  "shield-check": ShieldCheck,
  rocket: Rocket,
  "trending-up": TrendingUp,
  users: Users,
  zap: Zap,
  star: Star,
  heart: Heart,
  megaphone: Megaphone,
};

function FeatureIcon({ name }: { name: string }) {
  const Icon = FEATURE_ICONS[name.trim().toLowerCase()] ?? Sparkles;
  return <Icon className="size-4" />;
}

export function FeaturedCard({ item }: { item: ActiveFeatured }) {
  const external = item.destination_type === "external";

  function trackClick() {
    // Fire-and-forget analytics — a failed click request must never block
    // navigation, so failures are swallowed deliberately.
    void recordFeaturedClick(item.id, item.destination_type).catch(() => undefined);
  }

  const content = (
    <>
      <div className="relative aspect-[16/9] overflow-hidden">
        <img
          src={item.image_url}
          alt={item.image_alt ?? item.title}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      </div>

      <div className="flex flex-1 flex-col p-6 md:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
            <Megaphone className="size-3" />
            {item.badge_text || "Featured"}
          </span>
          {item.advertiser_name && (
            <span className="text-xs font-semibold text-muted-foreground">
              {item.advertiser_name}
            </span>
          )}
        </div>

        <h2 className="mt-4 text-xl font-bold tracking-tight md:text-2xl">{item.title}</h2>

        {item.description && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        )}

        {item.features.length > 0 && (
          <div className="mt-5 space-y-2.5">
            {item.features.map((feature: FeaturedFeature) => (
              <div
                key={feature.title}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-surface-low/60 p-3"
              >
                {feature.icon && (
                  <span className="mt-0.5 text-primary">
                    <FeatureIcon name={feature.icon} />
                  </span>
                )}
                <div>
                  <p className="text-xs font-bold">{feature.title}</p>
                  {feature.description && (
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {feature.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          {external ? (
            <a
              href={item.destination_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={trackClick}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              {item.cta_text || "Learn More"}
              <ExternalLink className="size-4" />
            </a>
          ) : (
            <Link
              to={item.destination_url}
              onClick={trackClick}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              {item.cta_text || "Learn More"}
              <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      </div>
    </>
  );

  return <SurfaceCard className="flex flex-col overflow-hidden">{content}</SurfaceCard>;
}
