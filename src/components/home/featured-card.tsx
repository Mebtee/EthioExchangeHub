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
  "group inline-flex w-fit items-center gap-1.5 rounded-lg bg-primary px-[18px] py-[9px] text-xs font-semibold " +
  "text-primary-foreground transition hover:scale-[1.03] hover:opacity-90 focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

/* Advertisement motion layer for the featured card. Everything animates with
   transform/opacity only, so the layout never shifts and the static design is
   pixel-identical when motion is disabled. The global prefers-reduced-motion
   rules in styles.css collapse all of these to a single instant frame. */
const FCARD_MOTION_CSS = `
@keyframes ee-fcard-image {
  0%, 12% { transform: translateX(0) scale(1); }
  55% { transform: translateX(-4px) scale(1.03); }
  88%, 100% { transform: translateX(0) scale(1); }
}
.ee-fcard-image-anim {
  animation: ee-fcard-image 6s ease-in-out infinite;
}
@keyframes ee-fcard-content-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.ee-fcard-content-anim {
  animation: ee-fcard-content-in 0.6s ease-out both;
}
@keyframes ee-fcard-badge-in {
  0% { opacity: 0; transform: scale(0.97); }
  100% { opacity: 1; transform: scale(1); }
}
.ee-fcard-badge-anim {
  animation: ee-fcard-badge-in 0.9s ease-out both;
}
`;

export function FeaturedCard({ item }: { item: ActiveFeatured }) {
  const external = item.destination_type === "external";
  const badge = item.badge_text || "Featured";

  function trackClick() {
    // Fire-and-forget analytics — a failed click request must never block
    // navigation, so failures are swallowed deliberately.
    void recordFeaturedClick(item.id, item.destination_type).catch(() => undefined);
  }

  return (
    <>
      <style>{FCARD_MOTION_CSS}</style>
      <div className="relative flex w-full flex-col overflow-hidden rounded-[20px] bg-[#f4f8f4] shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(0,0,0,0.12)] md:h-[250px] md:flex-row">
        {/* Left image section — gold wrapper behind an angled image */}
        <div
          className="relative h-56 w-full shrink-0 bg-[#c89d2d] md:h-full md:w-[48%]"
          style={{ clipPath: OUTER_CLIP }}
        >
          {/* Static clip keeps the chevron and gold border fixed while the
              image drifts inside it. */}
          <div className="h-full w-full overflow-hidden" style={{ clipPath: INNER_CLIP }}>
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.image_alt ?? item.title}
                loading="lazy"
                decoding="async"
                className="ee-fcard-image-anim block h-full w-full object-cover"
              />
            ) : (
              <div
                className="ee-fcard-image-anim flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0A4A30] to-[#075B3B]"
                aria-hidden
              >
                <Landmark className="size-16 text-[#f4f8f4]/90" />
              </div>
            )}
          </div>

          {badge && (
            <span className="ee-fcard-badge-anim absolute bottom-4 left-4 z-[2] text-[11px] font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">
              {badge}
            </span>
          )}
        </div>

        {/* Right content section */}
        <div className="ee-fcard-content-anim flex flex-col justify-center p-6 md:py-6 md:pl-2.5 md:pr-7">
          <span className="mb-2.5 inline-flex w-fit items-center gap-1 text-[10px] font-bold text-[#0c4429]">
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
                <ExternalLink
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </a>
            ) : (
              <Link to={item.destination_url} onClick={trackClick} className={CTA_CLASSES}>
                {item.cta_text || "Learn More"}
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
