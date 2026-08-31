import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { NotFoundError, ValidationError } from "@/lib/errors";
import { FeaturedContentClicksRepository } from "@/repositories/FeaturedContentClicksRepository";
import { FeaturedContentRepository } from "@/repositories/FeaturedContentRepository";
import { FeaturedContentServiceImpl } from "@/services/FeaturedContentService";
import type { Database, FeaturedContentClickRow, FeaturedContentRow } from "@/types/database";

import { createFakeSupabaseClient } from "../../helpers/supabase-client";
import {
  eligiblePair,
  featuredContentFixture,
  futureIso,
  pastIso,
} from "../../fixtures/featured-content";

/** Builds the real service over real repositories on a seeded in-memory client. */
function makeService(
  seedFeatured: FeaturedContentRow[] = [],
  seedClicks: FeaturedContentClickRow[] = [],
) {
  const client = createFakeSupabaseClient({
    featured_content: [...seedFeatured],
    featured_content_clicks: [...seedClicks],
  });
  const service = new FeaturedContentServiceImpl(
    new FeaturedContentRepository(client as unknown as SupabaseClient<Database>),
    new FeaturedContentClicksRepository(client as unknown as SupabaseClient<Database>),
  );
  return { service, client };
}

const createInput = {
  title: "Dashen Bank — New Year Savings",
  description: "Higher interest on fixed deposits.",
  image_url: "https://cdn.example.com/dashen-new-year.jpg",
  advertiser_name: "Dashen Bank",
  destination_url: "/offers/dashen-savings",
  destination_type: "internal" as const,
};

describe("FeaturedContentServiceImpl.getActiveFeaturedContent", () => {
  it("returns null when no campaigns exist", async () => {
    const { service } = makeService();
    expect(await service.getActiveFeaturedContent()).toBeNull();
  });

  it("returns null when every campaign is inactive", async () => {
    const { service } = makeService([
      featuredContentFixture({ is_active: false }),
      featuredContentFixture({ id: "other", is_active: false }),
    ]);
    expect(await service.getActiveFeaturedContent()).toBeNull();
  });

  it("excludes campaigns that have not started yet", async () => {
    const { service } = makeService([featuredContentFixture({ start_at: futureIso() })]);
    expect(await service.getActiveFeaturedContent()).toBeNull();
  });

  it("excludes campaigns that have expired", async () => {
    const { service } = makeService([featuredContentFixture({ end_at: pastIso() })]);
    expect(await service.getActiveFeaturedContent()).toBeNull();
  });

  it("includes a campaign whose schedule window is currently open", async () => {
    const { service } = makeService([
      featuredContentFixture({ start_at: pastIso(), end_at: futureIso() }),
    ]);
    const active = await service.getActiveFeaturedContent();
    expect(active?.id).toBe("featured-1");
  });

  it("picks the lowest display_order among eligible campaigns", async () => {
    const { service } = makeService([
      featuredContentFixture({ id: "first", display_order: 1 }),
      featuredContentFixture({ id: "zero", display_order: 0 }),
    ]);
    expect((await service.getActiveFeaturedContent())?.id).toBe("zero");
  });

  it("breaks display_order ties with newest created_at", async () => {
    const { service } = makeService(eligiblePair());
    expect((await service.getActiveFeaturedContent())?.id).toBe("featured-new");
  });

  it("ignores inactive rows during priority selection", async () => {
    const { service } = makeService([
      featuredContentFixture({ id: "inactive-zero", display_order: 0, is_active: false }),
      featuredContentFixture({ id: "active-one", display_order: 1 }),
    ]);
    expect((await service.getActiveFeaturedContent())?.id).toBe("active-one");
  });

  it("maps the row into the public DTO with a features array", async () => {
    const { service } = makeService([featuredContentFixture()]);
    const active = await service.getActiveFeaturedContent();
    expect(active).toMatchObject({
      id: "featured-1",
      title: "Awash Bank — Back-to-School Offer",
      badge_text: "SPONSORED",
      cta_text: "View Offer",
      destination_url: "/offers/awash-school",
      destination_type: "internal",
      features: [
        {
          icon: "graduation-cap",
          title: "Zero balance",
          description: "No minimum balance required.",
        },
        { icon: "percentage", title: "5% cashback", description: "On all card payments." },
      ],
    });
    expect(active?.features).toHaveLength(2);
  });
});

describe("FeaturedContentServiceImpl.createFeaturedContent", () => {
  it("applies badge/cta defaults and timestamps, and persists the row", async () => {
    const { service, client } = makeService();
    const created = await service.createFeaturedContent(createInput);

    expect(created.title).toBe("Dashen Bank — New Year Savings");
    expect(created.badge_text).toBe("FEATURED");
    expect(created.cta_text).toBe("Learn More");
    expect(created.is_active).toBe(true);
    expect(created.display_order).toBe(0);
    expect(created.created_by).toBeNull();
    expect(created.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(created.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const stored = client.tables.get("featured_content")!.find((r) => r.id === created.id);
    expect(stored?.title).toBe("Dashen Bank — New Year Savings");
  });

  it("normalizes empty optional strings to null", async () => {
    const { service } = makeService();
    const created = await service.createFeaturedContent({
      ...createInput,
      description: "   ",
      advertiser_name: "",
      feature_1_title: " ",
      start_at: "   ",
    });
    expect(created.description).toBeNull();
    expect(created.advertiser_name).toBeNull();
    expect(created.feature_1_title).toBeNull();
    expect(created.start_at).toBeNull();
  });

  it("honors explicit badge, cta, activity, and scheduling fields", async () => {
    const { service } = makeService();
    const created = await service.createFeaturedContent({
      ...createInput,
      badge_text: "LIMITED",
      cta_text: "Apply now",
      is_active: false,
      display_order: 3,
      start_at: futureIso(),
      end_at: pastIso(),
      created_by: "user-7",
    });
    expect(created.badge_text).toBe("LIMITED");
    expect(created.cta_text).toBe("Apply now");
    expect(created.is_active).toBe(false);
    expect(created.display_order).toBe(3);
    expect(created.created_by).toBe("user-7");
  });
});

describe("FeaturedContentServiceImpl.updateFeaturedContent", () => {
  it("updates provided fields only", async () => {
    const { service } = makeService([featuredContentFixture()]);
    const updated = await service.updateFeaturedContent("featured-1", {
      title: "Renamed campaign",
      display_order: 5,
    });
    expect(updated.title).toBe("Renamed campaign");
    expect(updated.display_order).toBe(5);
    expect(updated.badge_text).toBe("SPONSORED");
    expect(updated.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("normalizes cleared text to null and re-applies badge/cta defaults", async () => {
    const { service } = makeService([featuredContentFixture()]);
    const updated = await service.updateFeaturedContent("featured-1", {
      description: "",
      badge_text: null,
      cta_text: null,
    });
    expect(updated.description).toBeNull();
    expect(updated.badge_text).toBe("FEATURED");
    expect(updated.cta_text).toBe("Learn More");
  });

  it("throws NotFoundError for a missing campaign", async () => {
    const { service } = makeService([]);
    await expect(service.updateFeaturedContent("missing", { title: "x" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects a PATCH that flips destination_type without a valid external URL", async () => {
    // Stored: internal `/offers/awash-school`. PATCH sends only
    // destination_type=external — the final state would pair an external type
    // with a route path, so it must fail (the request body alone cannot see
    // the stored destination_url).
    const { service } = makeService([featuredContentFixture()]);
    await expect(
      service.updateFeaturedContent("featured-1", { destination_type: "external" }),
    ).rejects.toBeInstanceOf(ValidationError);
    // The stored row must be unchanged.
    const row = await service.getFeaturedContent("featured-1");
    expect(row.destination_type).toBe("internal");
    expect(row.destination_url).toBe("/offers/awash-school");
  });

  it("accepts a PATCH that flips destination_type together with a valid external URL", async () => {
    const { service } = makeService([featuredContentFixture()]);
    const updated = await service.updateFeaturedContent("featured-1", {
      destination_type: "external",
      destination_url: "https://example.com/offers/awash-school",
    });
    expect(updated.destination_type).toBe("external");
    expect(updated.destination_url).toBe("https://example.com/offers/awash-school");
  });

  it("applies every optional text field present in the patch", async () => {
    const { service } = makeService([featuredContentFixture()]);
    const startAt = futureIso();
    const endAt = futureIso();
    const updated = await service.updateFeaturedContent("featured-1", {
      image_url: "https://cdn.example.com/new.jpg",
      advertiser_name: "New Advertiser",
      image_alt: "New alt text",
      start_at: startAt,
      end_at: endAt,
      created_by: "user-9",
      feature_1_icon: "bank",
      feature_1_title: "New feature 1",
      feature_1_description: "Updated feature 1 copy",
      feature_2_icon: "shield",
      feature_2_title: "New feature 2",
      feature_2_description: "Updated feature 2 copy",
      feature_3_icon: "star",
      feature_3_title: "New feature 3",
      feature_3_description: "Updated feature 3 copy",
    });
    expect(updated.image_url).toBe("https://cdn.example.com/new.jpg");
    expect(updated.advertiser_name).toBe("New Advertiser");
    expect(updated.image_alt).toBe("New alt text");
    expect(updated.start_at).toBe(startAt);
    expect(updated.end_at).toBe(endAt);
    expect(updated.created_by).toBe("user-9");
    expect(updated.feature_1_icon).toBe("bank");
    expect(updated.feature_1_title).toBe("New feature 1");
    expect(updated.feature_1_description).toBe("Updated feature 1 copy");
    expect(updated.feature_2_icon).toBe("shield");
    expect(updated.feature_2_title).toBe("New feature 2");
    expect(updated.feature_2_description).toBe("Updated feature 2 copy");
    expect(updated.feature_3_icon).toBe("star");
    expect(updated.feature_3_title).toBe("New feature 3");
    expect(updated.feature_3_description).toBe("Updated feature 3 copy");
  });

  it("rejects protocol-relative and unsafe destination URLs in the final state", async () => {
    const { service } = makeService([featuredContentFixture()]);
    await expect(
      service.updateFeaturedContent("featured-1", { destination_url: "//evil.com" }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      service.updateFeaturedContent("featured-1", { destination_url: "javascript:alert(1)" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("FeaturedContentServiceImpl.deleteFeaturedContent", () => {
  it("deletes an existing campaign", async () => {
    const { service, client } = makeService([featuredContentFixture()]);
    await expect(service.deleteFeaturedContent("featured-1")).resolves.toBeUndefined();
    expect(client.tables.get("featured_content")!.some((r) => r.id === "featured-1")).toBe(false);
  });

  it("throws NotFoundError for a missing campaign", async () => {
    const { service } = makeService([]);
    await expect(service.deleteFeaturedContent("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("FeaturedContentServiceImpl.listFeaturedContent", () => {
  it("returns every campaign with an aggregated click count", async () => {
    const { service } = makeService(
      [featuredContentFixture({ id: "featured-1" }), featuredContentFixture({ id: "featured-2" })],
      [
        {
          id: "click-1",
          featured_content_id: "featured-1",
          destination_type: "internal",
          created_at: "2026-08-02T10:00:00.000Z",
        },
        {
          id: "click-2",
          featured_content_id: "featured-1",
          destination_type: "external",
          created_at: "2026-08-02T11:00:00.000Z",
        },
        {
          id: "click-3",
          featured_content_id: "featured-2",
          destination_type: null,
          created_at: "2026-08-02T12:00:00.000Z",
        },
      ],
    );
    const rows = await service.listFeaturedContent();
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.id === "featured-1")?.click_count).toBe(2);
    expect(rows.find((r) => r.id === "featured-2")?.click_count).toBe(1);
  });

  it("reports zero clicks for campaigns without click rows", async () => {
    const { service } = makeService([featuredContentFixture()]);
    const rows = await service.listFeaturedContent();
    expect(rows[0]?.click_count).toBe(0);
  });
});

describe("FeaturedContentServiceImpl.recordClick + getClickCount", () => {
  it("appends a click row with the destination type", async () => {
    const { service, client } = makeService([featuredContentFixture()]);
    await service.recordClick("featured-1", "external");
    const clicks = client.tables.get("featured_content_clicks")!;
    expect(clicks).toHaveLength(1);
    expect(clicks[0]).toMatchObject({
      featured_content_id: "featured-1",
      destination_type: "external",
    });
    expect(await service.getClickCount("featured-1")).toBe(1);
  });

  it("defaults the destination type to null and counts multiple clicks", async () => {
    const { service } = makeService([featuredContentFixture()]);
    await service.recordClick("featured-1");
    await service.recordClick("featured-1");
    expect(await service.getClickCount("featured-1")).toBe(2);
  });

  it("throws NotFoundError when the campaign is missing", async () => {
    const { service } = makeService([]);
    await expect(service.recordClick("missing")).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.getClickCount("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
