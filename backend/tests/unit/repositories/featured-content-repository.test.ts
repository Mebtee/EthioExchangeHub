import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { FeaturedContentClicksRepository } from "@/repositories/FeaturedContentClicksRepository";
import { FeaturedContentRepository } from "@/repositories/FeaturedContentRepository";
import type { Database, FeaturedContentClickRow } from "@/types/database";

import { featuredContentFixture } from "../../fixtures/featured-content";
import { createFakeSupabaseClient } from "../../helpers/supabase-client";

function makeRepos() {
  const client = createFakeSupabaseClient({
    featured_content: [
      featuredContentFixture({
        id: "fc-a",
        display_order: 1,
        is_active: true,
        created_at: "2026-07-01T09:00:00.000Z",
      }),
      featuredContentFixture({
        id: "fc-b",
        display_order: 0,
        is_active: true,
        created_at: "2026-08-01T09:00:00.000Z",
      }),
      featuredContentFixture({
        id: "fc-off",
        display_order: 0,
        is_active: false,
        created_at: "2026-08-02T09:00:00.000Z",
      }),
    ],
    featured_content_clicks: [
      {
        id: "c1",
        featured_content_id: "fc-a",
        destination_type: "internal",
        created_at: "2026-08-02T09:00:00.000Z",
      },
      {
        id: "c2",
        featured_content_id: "fc-a",
        destination_type: "external",
        created_at: "2026-08-02T10:00:00.000Z",
      },
    ] as FeaturedContentClickRow[],
  });
  const featuredRepo = new FeaturedContentRepository(client as unknown as SupabaseClient<Database>);
  const clicksRepo = new FeaturedContentClicksRepository(
    client as unknown as SupabaseClient<Database>,
  );
  return { client, featuredRepo, clicksRepo };
}

describe("FeaturedContentRepository.findAllActive", () => {
  it("returns only active rows ordered by display_order asc, created_at desc", async () => {
    const { featuredRepo } = makeRepos();
    const rows = await featuredRepo.findAllActive();
    expect(rows.map((r) => r.id)).toEqual(["fc-b", "fc-a"]);
  });

  it("returns an empty list when no rows are active", async () => {
    const { featuredRepo } = makeRepos();
    const rows = await featuredRepo.findAllActive();
    expect(rows.some((r) => r.id === "fc-off")).toBe(false);
  });
});

describe("FeaturedContentRepository base CRUD", () => {
  it("inserts a row and returns it", async () => {
    const { featuredRepo, client } = makeRepos();
    const created = await featuredRepo.insert({
      title: "New campaign",
      image_url: "https://cdn.example.com/new.jpg",
      destination_url: "/offers/new",
      destination_type: "internal",
      is_active: true,
      display_order: 0,
      badge_text: "FEATURED",
      cta_text: "Learn More",
    });
    expect(created.id).toBeTypeOf("string");
    const stored = client.tables.get("featured_content")!.find((r) => r.id === created.id);
    expect(stored?.title).toBe("New campaign");
  });

  it("finds, updates, and deletes by id", async () => {
    const { featuredRepo, client } = makeRepos();
    const found = await featuredRepo.findOneBy({ id: "fc-b" });
    expect(found?.title).toBe("Awash Bank — Back-to-School Offer");

    const updated = await featuredRepo.updateBy({ id: "fc-b" }, { display_order: 9 });
    expect(updated?.display_order).toBe(9);

    const deleted = await featuredRepo.deleteBy({ id: "fc-a" });
    expect(deleted).toBe(true);
    expect(client.tables.get("featured_content")!.some((r) => r.id === "fc-a")).toBe(false);
  });
});

describe("FeaturedContentClicksRepository", () => {
  it("counts clicks per campaign and aggregates across campaigns", async () => {
    const { clicksRepo } = makeRepos();
    expect(await clicksRepo.countByContentId("fc-a")).toBe(2);
    expect(await clicksRepo.countByContentId("fc-b")).toBe(0);
    const counts = await clicksRepo.countByContentIds();
    expect(counts.get("fc-a")).toBe(2);
    expect(counts.get("fc-b")).toBeUndefined();
    expect(counts.size).toBe(1);
  });

  it("aggregates in JS — never requests a PostgREST aggregate function", async () => {
    const { clicksRepo, client } = makeRepos();
    const counts = await clicksRepo.countByContentIds();
    expect(counts.get("fc-a")).toBe(2);
    expect(client.lastSelect).toBe("featured_content_id");
    expect(client.lastSelect).not.toContain("count(");
  });

  it("returns an empty map when no clicks exist", async () => {
    const { clicksRepo, client } = makeRepos();
    client.tables.get("featured_content_clicks")!.length = 0;
    const counts = await clicksRepo.countByContentIds();
    expect(counts.size).toBe(0);
  });

  it("appends click rows", async () => {
    const { clicksRepo, client } = makeRepos();
    await clicksRepo.insert({
      featured_content_id: "fc-b",
      destination_type: null,
      created_at: "2026-08-03T09:00:00.000Z",
    });
    expect(await clicksRepo.countByContentId("fc-b")).toBe(1);
    expect(client.tables.get("featured_content_clicks")!).toHaveLength(3);
  });
});
