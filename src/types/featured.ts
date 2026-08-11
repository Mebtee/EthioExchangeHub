/**
 * Featured-content domain types.
 *
 * Every shape below mirrors the real backend contract served by
 * `src/lib/api/featured.ts` — see `backend/docs/FEATURED_CONTENT.md`. The
 * frontend never decides activity; it renders whatever `GET /api/v1/featured`
 * returns, which is `null` when nothing qualifies.
 */

/** A client-side route path or an external website. */
export type FeaturedDestinationType = "internal" | "external";

/** One bottom-row highlight rendered on the featured card. */
export interface FeaturedFeature {
  icon: string;
  title: string;
  description: string;
}

/** The single eligible campaign served by `GET /api/v1/featured` (or null). */
export interface ActiveFeatured {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  image_alt: string | null;
  advertiser_name: string | null;
  badge_text: string;
  cta_text: string;
  destination_url: string;
  destination_type: FeaturedDestinationType;
  features: FeaturedFeature[];
}

/** Full admin row (any state) plus its aggregate click count. */
export interface AdminFeaturedItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  advertiser_name: string | null;
  badge_text: string;
  cta_text: string;
  destination_url: string;
  destination_type: string;
  image_alt: string | null;
  is_active: boolean;
  display_order: number;
  /** Scheduled start; null = immediately eligible (when active). */
  start_at: string | null;
  /** Scheduled end; null = never expires. */
  end_at: string | null;
  created_by: string | null;
  feature_1_icon: string | null;
  feature_1_title: string | null;
  feature_1_description: string | null;
  feature_2_icon: string | null;
  feature_2_title: string | null;
  feature_2_description: string | null;
  feature_3_icon: string | null;
  feature_3_title: string | null;
  feature_3_description: string | null;
  created_at: string;
  updated_at: string;
  click_count: number;
}

/** Payload for `POST /api/v1/admin/featured`. */
export interface FeaturedPayload {
  title: string;
  description?: string | null;
  image_url: string;
  advertiser_name?: string | null;
  badge_text?: string | null;
  cta_text?: string | null;
  destination_url: string;
  destination_type: FeaturedDestinationType;
  image_alt?: string | null;
  is_active?: boolean;
  display_order?: number;
  start_at?: string | null;
  end_at?: string | null;
  feature_1_icon?: string | null;
  feature_1_title?: string | null;
  feature_1_description?: string | null;
  feature_2_icon?: string | null;
  feature_2_title?: string | null;
  feature_2_description?: string | null;
  feature_3_icon?: string | null;
  feature_3_title?: string | null;
  feature_3_description?: string | null;
}

/** Payload for `PATCH /api/v1/admin/featured/:id` — any subset, ≥1 field. */
export type FeaturedUpdate = Partial<FeaturedPayload>;
