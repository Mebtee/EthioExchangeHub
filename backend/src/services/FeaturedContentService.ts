import { NotFoundError, ValidationError } from "@/lib/errors";
import { FeaturedContentClicksRepository } from "@/repositories/FeaturedContentClicksRepository";
import { FeaturedContentRepository } from "@/repositories/FeaturedContentRepository";
import type { FeaturedContentRow } from "@/types/database";
import { nowIso } from "@/utils/date";
import { validateDestinationPair } from "@/validators/featured";

/** Destination type: a client-side route or an external website. */
export type DestinationType = "internal" | "external";

/** One bottom-row highlight rendered on the featured card. */
export interface FeaturedFeature {
  icon: string;
  title: string;
  description: string;
}

/** Input for creating a featured campaign (API body shape). */
export interface FeaturedContentInput {
  title: string;
  description?: string | null;
  image_url: string;
  advertiser_name?: string | null;
  badge_text?: string | null;
  cta_text?: string | null;
  destination_url: string;
  destination_type: DestinationType;
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
  /** FK → auth user id, set server-side from the session. */
  created_by?: string | null;
}

/** Partial input for updating a featured campaign. */
export type UpdateFeaturedContentInput = Partial<FeaturedContentInput>;

/**
 * Public DTO served by `GET /api/v1/featured` — the homepage's single active
 * campaign. Field names follow the API's snake_case row convention with the
 * three bottom-row highlights collected into a `features` array.
 */
export interface ActiveFeaturedContent {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  image_alt: string | null;
  advertiser_name: string | null;
  badge_text: string;
  cta_text: string;
  destination_url: string;
  destination_type: DestinationType;
  features: FeaturedFeature[];
}

/** Admin list item: a full row plus its aggregate click count. */
export interface FeaturedContentAdminItem extends FeaturedContentRow {
  click_count: number;
}

/** Public contract of the featured-content service. */
export interface FeaturedContentService {
  getActiveFeaturedContent(): Promise<ActiveFeaturedContent | null>;
  listFeaturedContent(): Promise<FeaturedContentAdminItem[]>;
  getFeaturedContent(id: string): Promise<FeaturedContentRow>;
  createFeaturedContent(input: FeaturedContentInput): Promise<FeaturedContentRow>;
  updateFeaturedContent(
    id: string,
    updates: UpdateFeaturedContentInput,
  ): Promise<FeaturedContentRow>;
  deleteFeaturedContent(id: string): Promise<void>;
  recordClick(id: string, destinationType?: DestinationType): Promise<void>;
  getClickCount(id: string): Promise<number>;
}

/**
 * Featured-content business logic.
 *
 * The SINGLE selection rule for the homepage lives in `getActiveFeaturedContent`
 * (see `isEligible` + `compareByPriority`): a campaign is eligible while
 * `is_active` and within its schedule window, and the highest-priority eligible
 * row (display_order ascending, created_at descending) wins. The frontend never
 * decides activity — it consumes whatever this service returns, which is null
 * when nothing is eligible.
 */
export class FeaturedContentServiceImpl implements FeaturedContentService {
  constructor(
    private readonly featuredContentRepository: FeaturedContentRepository,
    private readonly clicksRepository: FeaturedContentClicksRepository,
  ) {}

  /** Returns the single currently-eligible campaign, or null when none exists. */
  async getActiveFeaturedContent(): Promise<ActiveFeaturedContent | null> {
    const now = Date.now();
    const rows = await this.featuredContentRepository.findAllActive();
    const eligible = rows.filter((row) => isEligible(row, now)).sort(compareByPriority);
    const top = eligible[0] ?? null;
    return top === null ? null : toActiveDto(top);
  }

  /**
   * Lists every campaign (any state) for the admin, newest by display_order.
   * Click counts are aggregated in JS (PostgREST aggregates are disabled on
   * this instance), so only the `featured_content_id` column is fetched.
   */
  async listFeaturedContent(): Promise<FeaturedContentAdminItem[]> {
    const rows = await this.featuredContentRepository.findAll({
      orderBy: "display_order",
      ascending: true,
    });
    const countByContent = await this.clicksRepository.countByContentIds();
    return rows.map((row) => ({
      ...row,
      click_count: countByContent.get(row.id) ?? 0,
    }));
  }

  /** Returns one campaign row, throwing NotFoundError when absent. */
  async getFeaturedContent(id: string): Promise<FeaturedContentRow> {
    return this.getExisting(id);
  }

  /** Creates a campaign, applying defaults for the not-null columns. */
  async createFeaturedContent(input: FeaturedContentInput): Promise<FeaturedContentRow> {
    const timestamp = nowIso();
    return this.featuredContentRepository.insert({
      title: input.title,
      description: normalizeNullable(input.description),
      image_url: input.image_url,
      advertiser_name: normalizeNullable(input.advertiser_name),
      badge_text: input.badge_text ?? "FEATURED",
      cta_text: input.cta_text ?? "Learn More",
      destination_url: input.destination_url,
      destination_type: input.destination_type,
      image_alt: normalizeNullable(input.image_alt),
      is_active: input.is_active ?? true,
      display_order: input.display_order ?? 0,
      start_at: normalizeNullable(input.start_at),
      end_at: normalizeNullable(input.end_at),
      created_by: normalizeNullable(input.created_by),
      feature_1_icon: normalizeNullable(input.feature_1_icon),
      feature_1_title: normalizeNullable(input.feature_1_title),
      feature_1_description: normalizeNullable(input.feature_1_description),
      feature_2_icon: normalizeNullable(input.feature_2_icon),
      feature_2_title: normalizeNullable(input.feature_2_title),
      feature_2_description: normalizeNullable(input.feature_2_description),
      feature_3_icon: normalizeNullable(input.feature_3_icon),
      feature_3_title: normalizeNullable(input.feature_3_title),
      feature_3_description: normalizeNullable(input.feature_3_description),
      created_at: timestamp,
      updated_at: timestamp,
    });
  }

  /** Updates an existing campaign, re-normalizing optional fields. */
  async updateFeaturedContent(
    id: string,
    updates: UpdateFeaturedContentInput,
  ): Promise<FeaturedContentRow> {
    const existing = await this.getExisting(id);

    // The request body may not contain both fields (e.g. a PATCH that flips
    // destination_type only). Validate the MERGED final state against the
    // stored row so an internal route can't silently become an external
    // destination with a `//host` or `javascript:` URL (or vice versa).
    const mergedDestinationUrl = updates.destination_url ?? existing.destination_url;
    const mergedDestinationType = (updates.destination_type ??
      existing.destination_type) as DestinationType;
    const destinationProblem = validateDestinationPair(mergedDestinationUrl, mergedDestinationType);
    if (destinationProblem !== null) {
      throw new ValidationError(destinationProblem);
    }

    const payload: Partial<FeaturedContentRow> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined)
      payload.description = normalizeNullable(updates.description);
    if (updates.image_url !== undefined) payload.image_url = updates.image_url;
    if (updates.advertiser_name !== undefined)
      payload.advertiser_name = normalizeNullable(updates.advertiser_name);
    if (updates.badge_text !== undefined) payload.badge_text = updates.badge_text ?? "FEATURED";
    if (updates.cta_text !== undefined) payload.cta_text = updates.cta_text ?? "Learn More";
    if (updates.destination_url !== undefined) payload.destination_url = updates.destination_url;
    if (updates.destination_type !== undefined) payload.destination_type = updates.destination_type;
    if (updates.image_alt !== undefined) payload.image_alt = normalizeNullable(updates.image_alt);
    if (updates.is_active !== undefined) payload.is_active = updates.is_active;
    if (updates.display_order !== undefined) payload.display_order = updates.display_order;
    if (updates.start_at !== undefined) payload.start_at = normalizeNullable(updates.start_at);
    if (updates.end_at !== undefined) payload.end_at = normalizeNullable(updates.end_at);
    if (updates.created_by !== undefined)
      payload.created_by = normalizeNullable(updates.created_by);
    if (updates.feature_1_icon !== undefined)
      payload.feature_1_icon = normalizeNullable(updates.feature_1_icon);
    if (updates.feature_1_title !== undefined)
      payload.feature_1_title = normalizeNullable(updates.feature_1_title);
    if (updates.feature_1_description !== undefined)
      payload.feature_1_description = normalizeNullable(updates.feature_1_description);
    if (updates.feature_2_icon !== undefined)
      payload.feature_2_icon = normalizeNullable(updates.feature_2_icon);
    if (updates.feature_2_title !== undefined)
      payload.feature_2_title = normalizeNullable(updates.feature_2_title);
    if (updates.feature_2_description !== undefined)
      payload.feature_2_description = normalizeNullable(updates.feature_2_description);
    if (updates.feature_3_icon !== undefined)
      payload.feature_3_icon = normalizeNullable(updates.feature_3_icon);
    if (updates.feature_3_title !== undefined)
      payload.feature_3_title = normalizeNullable(updates.feature_3_title);
    if (updates.feature_3_description !== undefined)
      payload.feature_3_description = normalizeNullable(updates.feature_3_description);
    payload.updated_at = nowIso();

    const row = await this.featuredContentRepository.updateBy({ id }, payload);
    if (row === null) {
      throw new NotFoundError(`Featured content "${id}" was removed before the update completed.`);
    }
    return row;
  }

  /** Deletes a campaign, throwing NotFoundError when absent. */
  async deleteFeaturedContent(id: string): Promise<void> {
    await this.getExisting(id);
    const deleted = await this.featuredContentRepository.deleteBy({ id });
    if (!deleted) {
      throw new NotFoundError(`Featured content "${id}" was removed before the delete completed.`);
    }
  }

  /** Appends a click record (fire-and-forget analytics; no personal data). */
  async recordClick(id: string, destinationType?: DestinationType): Promise<void> {
    await this.getExisting(id);
    await this.clicksRepository.insert({
      featured_content_id: id,
      destination_type: destinationType ?? null,
      created_at: nowIso(),
    });
  }

  /** Total recorded clicks for a campaign. */
  async getClickCount(id: string): Promise<number> {
    await this.getExisting(id);
    return this.clicksRepository.countByContentId(id);
  }

  /** Returns the existing row or throws NotFoundError. */
  private async getExisting(id: string): Promise<FeaturedContentRow> {
    const existing = await this.featuredContentRepository.findOneBy({ id });
    if (existing === null) {
      throw new NotFoundError(`Featured content "${id}" not found.`);
    }
    return existing;
  }
}

/**
 * The eligibility rule: active, within schedule window (start_at <= now when
 * set; end_at >= now when set). Comparing by epoch millis (not string
 * comparison) keeps it correct across Supabase's varied timestamptz formats.
 */
function isEligible(row: FeaturedContentRow, nowMs: number): boolean {
  if (!row.is_active) return false;
  if (row.start_at !== null && Date.parse(row.start_at) > nowMs) return false;
  if (row.end_at !== null && Date.parse(row.end_at) < nowMs) return false;
  return true;
}

/** Priority: display_order ascending, then created_at descending. */
function compareByPriority(a: FeaturedContentRow, b: FeaturedContentRow): number {
  if (a.display_order !== b.display_order) return a.display_order - b.display_order;
  return Date.parse(b.created_at) - Date.parse(a.created_at);
}

/** Maps a row to the public homepage DTO. */
function toActiveDto(row: FeaturedContentRow): ActiveFeaturedContent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    image_url: row.image_url,
    image_alt: row.image_alt,
    advertiser_name: row.advertiser_name,
    badge_text: row.badge_text,
    cta_text: row.cta_text,
    destination_url: row.destination_url,
    destination_type: row.destination_type === "internal" ? "internal" : "external",
    features: [toFeature(row, 1), toFeature(row, 2), toFeature(row, 3)].filter(
      (feature): feature is FeaturedFeature => feature !== null,
    ),
  };
}

/** Maps one numbered bottom-row highlight; null when its title is absent. */
function toFeature(row: FeaturedContentRow, index: 1 | 2 | 3): FeaturedFeature | null {
  const title = row[`feature_${index}_title`];
  if (!title) return null;
  return {
    icon: row[`feature_${index}_icon`] ?? "",
    title,
    description: row[`feature_${index}_description`] ?? "",
  };
}

/** Trims optional text; empty/whitespace/undefined becomes null. */
function normalizeNullable(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
