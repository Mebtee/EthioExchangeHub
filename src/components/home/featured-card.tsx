import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, Landmark, Star } from "lucide-react";

import { recordFeaturedClick } from "@/lib/api/featured";
import type { ActiveFeatured } from "@/types/featured";

/**
 * Angled "chevron" right edge. The outer wrapper is clipped to this polygon,
 * while the image itself uses a slightly inset version so ~3px of the gold
 * wrapper background stays visible as a border around the angled edge.
 */
const OUTER_CLIP = "polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%)";
const INNER_CLIP =
  "polygon(0% 0%, calc(85% - 3px) 0%, calc(100% - 3px) 50%, calc(85% - 3px) 100%, 0% 100%)";

const CTA_CLASSES =
  "inline-flex w-fit items-center gap-1.5 rounded-lg bg-[#0c4429] px-[18px] py-[9px] text-xs font-semibold " +
  "text-white transition hover:bg-[#0a3a23] focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-[#0c4429] focus-visible:ring-offset-2";

export function FeaturedCard({ item }: { item: ActiveFeatured }) {
  const external = item.destination_type === "external";
  const badge = item.badge_text || "Featured";

  function trackClick() {
    // Fire-and-forget analytics — a failed click request must never block
    // navigation, so failures are swallowed deliberately.
    void recordFeaturedClick(item.id, item.destination_type).catch(() => undefined);
  }

  return (
    <div className="relative flex w-full flex-col overflow-hidden rounded-[20px] bg-[#f4f8f4] shadow-[0_10px_30px_rgba(0,0,0,0.05)] md:h-[250px] md:flex-row">
      {/* Left image section — gold wrapper behind an angled image */}
      <div
        className="relative h-56 w-full shrink-0 bg-[#c89d2d] md:h-full md:w-[48%]"
        style={{ clipPath: OUTER_CLIP }}
      >
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.image_alt ?? item.title}
            loading="lazy"
            decoding="async"
            className="block h-full w-full object-cover"
            style={{ clipPath: INNER_CLIP }}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0A4A30] to-[#075B3B]"
            style={{ clipPath: INNER_CLIP }}
            aria-hidden
          >
            <Landmark className="size-16 text-[#f4f8f4]/90" />
          </div>
        )}

        {badge && (
          <span className="absolute bottom-4 left-4 z-[2] rounded-[6px] bg-[#0c4429] px-3 py-1.5 text-[11px] font-semibold text-white">
            {badge}
          </span>
        )}
      </div>

      {/* Right content section */}
      <div className="flex flex-col justify-center p-6 md:py-6 md:pl-2.5 md:pr-7">
        <span className="mb-2.5 inline-flex w-fit items-center gap-1 rounded-[12px] bg-[#d8ebd9] px-2.5 py-1 text-[10px] font-bold text-[#0c4429]">
          <Star className="size-3 fill-[#c89d2d] text-[#c89d2d]" aria-hidden />
          {badge}
        </span>

        {item.advertiser_name && (
          <p className="m-0 text-[13px] font-semibold text-[#2c3e50]">{item.advertiser_name}</p>
        )}

        <h2 className="mb-2 mt-1 text-xl font-bold text-[#0c4429]">{item.title}</h2>

        {item.description && (
          <p className="mb-[18px] mt-0 text-xs leading-[1.4] text-[#666]">{item.description}</p>
        )}

        <div>
          {external ? (
            <a
              href={item.destination_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={trackClick}
              className={CTA_CLASSES}
            >
              {item.cta_text || "Learn More"}
              <ExternalLink className="size-4" aria-hidden />
            </a>
          ) : (
            <Link to={item.destination_url} onClick={trackClick} className={CTA_CLASSES}>
              {item.cta_text || "Learn More"}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
