import type { FeaturedContentRow } from "@/types/database";

/** ISO timestamp 1 day in the future (scheduled campaign). */
export const futureIso = (): string => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

/** ISO timestamp 1 day in the past (expired campaign). */
export const pastIso = (): string => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

/** A complete, currently-eligible campaign row. */
export function featuredContentFixture(
  overrides: Partial<FeaturedContentRow> = {},
): FeaturedContentRow {
  return {
    id: "featured-1",
    title: "Awash Bank — Back-to-School Offer",
    description: "Student account promotions for the new term.",
    image_url: "https://cdn.example.com/awash-school.jpg",
    advertiser_name: "Awash Bank",
    badge_text: "SPONSORED",
    cta_text: "View Offer",
    destination_url: "/offers/awash-school",
    destination_type: "internal",
    image_alt: "Awash Bank back-to-school promotion",
    is_active: true,
    display_order: 0,
    start_at: null,
    end_at: null,
    created_by: "user-1",
    feature_1_icon: "graduation-cap",
    feature_1_title: "Zero balance",
    feature_1_description: "No minimum balance required.",
    feature_2_icon: "percentage",
    feature_2_title: "5% cashback",
    feature_2_description: "On all card payments.",
    feature_3_icon: null,
    feature_3_title: null,
    feature_3_description: null,
    created_at: "2026-08-01T09:00:00.000Z",
    updated_at: "2026-08-01T09:00:00.000Z",
    ...overrides,
  };
}

/** Two eligible campaigns differing only in priority/creation time. */
export function eligiblePair(): FeaturedContentRow[] {
  return [
    featuredContentFixture({
      id: "featured-old",
      display_order: 0,
      created_at: "2026-07-01T09:00:00.000Z",
    }),
    featuredContentFixture({
      id: "featured-new",
      display_order: 0,
      created_at: "2026-08-01T09:00:00.000Z",
    }),
  ];
}
