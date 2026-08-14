import { describe, expect, it } from "vitest";

import {
  createFeaturedContentBodySchema,
  recordFeaturedClickBodySchema,
  updateFeaturedContentBodySchema,
} from "@/validators/featured";

const validBody = {
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
};

describe("createFeaturedContentBodySchema", () => {
  it("accepts a complete valid body", () => {
    expect(createFeaturedContentBodySchema.safeParse(validBody).success).toBe(true);
  });

  it("accepts a minimal body with only required fields (activity defaults apply)", () => {
    const result = createFeaturedContentBodySchema.safeParse({
      title: "Offer",
      image_url: "https://cdn.example.com/img.jpg",
      destination_url: "https://example.com",
      destination_type: "external",
    });
    expect(result.success).toBe(true);
  });

  it("normalizes empty optional strings to null", () => {
    const result = createFeaturedContentBodySchema.safeParse({
      ...validBody,
      description: "   ",
      advertiser_name: "",
      feature_1_title: " ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeNull();
      expect(result.data.advertiser_name).toBeNull();
      expect(result.data.feature_1_title).toBeNull();
    }
  });

  it("rejects missing required fields", () => {
    expect(createFeaturedContentBodySchema.safeParse({}).success).toBe(false);
    expect(
      createFeaturedContentBodySchema.safeParse({ title: "x", image_url: "https://a.b/c.jpg" })
        .success,
    ).toBe(false);
  });

  it("rejects unknown keys (strict)", () => {
    expect(
      createFeaturedContentBodySchema.safeParse({ ...validBody, typo_field: "nope" }).success,
    ).toBe(false);
  });

  it("rejects non-http(s) image URLs", () => {
    expect(
      createFeaturedContentBodySchema.safeParse({ ...validBody, image_url: "javascript:alert(1)" })
        .success,
    ).toBe(false);
    expect(
      createFeaturedContentBodySchema.safeParse({ ...validBody, image_url: "/relative/path" })
        .success,
    ).toBe(false);
  });

  it("requires external destinations to be absolute http(s) URLs", () => {
    expect(
      createFeaturedContentBodySchema.safeParse({
        ...validBody,
        destination_type: "external",
        destination_url: "/offers/x",
      }).success,
    ).toBe(false);
    expect(
      createFeaturedContentBodySchema.safeParse({
        ...validBody,
        destination_type: "external",
        destination_url: "javascript:alert(1)",
      }).success,
    ).toBe(false);
    expect(
      createFeaturedContentBodySchema.safeParse({
        ...validBody,
        destination_type: "external",
        destination_url: "data:text/html,<script>alert(1)</script>",
      }).success,
    ).toBe(false);
    expect(
      createFeaturedContentBodySchema.safeParse({
        ...validBody,
        destination_type: "external",
        destination_url: "vbscript:msgbox(1)",
      }).success,
    ).toBe(false);
  });

  it("rejects protocol-relative URLs for both destination types", () => {
    expect(
      createFeaturedContentBodySchema.safeParse({
        ...validBody,
        destination_type: "internal",
        destination_url: "//evil.com",
      }).success,
    ).toBe(false);
    expect(
      createFeaturedContentBodySchema.safeParse({
        ...validBody,
        destination_type: "external",
        destination_url: "//evil.com",
      }).success,
    ).toBe(false);
    // Protocol-relative URLs with a path are still rejected.
    expect(
      createFeaturedContentBodySchema.safeParse({
        ...validBody,
        destination_type: "internal",
        destination_url: "//evil.com/offers/x",
      }).success,
    ).toBe(false);
  });

  it("requires internal destinations to be a route path (not an absolute URL)", () => {
    expect(
      createFeaturedContentBodySchema.safeParse({
        ...validBody,
        destination_url: "offers/x",
      }).success,
    ).toBe(false);
    expect(
      createFeaturedContentBodySchema.safeParse({
        ...validBody,
        destination_url: "https://example.com/offers/x",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid destination_type and display_order", () => {
    expect(
      createFeaturedContentBodySchema.safeParse({ ...validBody, destination_type: "deep-link" })
        .success,
    ).toBe(false);
    expect(
      createFeaturedContentBodySchema.safeParse({ ...validBody, display_order: -1 }).success,
    ).toBe(false);
  });

  it("rejects invalid date-times and reversed schedule windows", () => {
    expect(
      createFeaturedContentBodySchema.safeParse({ ...validBody, start_at: "not-a-date" }).success,
    ).toBe(false);
    expect(
      createFeaturedContentBodySchema.safeParse({
        ...validBody,
        start_at: "2026-08-10T00:00:00Z",
        end_at: "2026-08-01T00:00:00Z",
      }).success,
    ).toBe(false);
  });

  it("accepts an open-ended schedule window", () => {
    const result = createFeaturedContentBodySchema.safeParse({
      ...validBody,
      start_at: "2026-08-01T00:00:00Z",
      end_at: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("updateFeaturedContentBodySchema", () => {
  it("accepts any subset of fields", () => {
    expect(updateFeaturedContentBodySchema.safeParse({ title: "Renamed" }).success).toBe(true);
    expect(
      updateFeaturedContentBodySchema.safeParse({
        is_active: false,
        display_order: 7,
        start_at: "2026-09-01T00:00:00Z",
      }).success,
    ).toBe(true);
  });

  it("rejects an empty body", () => {
    expect(updateFeaturedContentBodySchema.safeParse({}).success).toBe(false);
  });

  it("normalizes empty strings to null", () => {
    const result = updateFeaturedContentBodySchema.safeParse({ description: "   " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeNull();
    }
  });

  it("validates destination_url against the current destination_type", () => {
    expect(
      updateFeaturedContentBodySchema.safeParse({
        destination_type: "external",
        destination_url: "/offers/x",
      }).success,
    ).toBe(false);
    expect(
      updateFeaturedContentBodySchema.safeParse({
        destination_url: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });

  it("rejects protocol-relative destination URLs on PATCH", () => {
    expect(
      updateFeaturedContentBodySchema.safeParse({
        destination_type: "internal",
        destination_url: "//evil.com",
      }).success,
    ).toBe(false);
    expect(
      updateFeaturedContentBodySchema.safeParse({
        destination_type: "external",
        destination_url: "//evil.com",
      }).success,
    ).toBe(false);
  });

  it("accepts a destination_url alone when it is valid for either stored type", () => {
    // Route path (valid for internal) and absolute https URL (valid for
    // external) both pass the schema; the service re-validates the merged
    // pair against the stored destination_type.
    expect(updateFeaturedContentBodySchema.safeParse({ destination_url: "/banks" }).success).toBe(
      true,
    );
    expect(
      updateFeaturedContentBodySchema.safeParse({
        destination_url: "https://example.com/banks",
      }).success,
    ).toBe(true);
  });

  it("rejects a reversed schedule window in updates", () => {
    expect(
      updateFeaturedContentBodySchema.safeParse({
        start_at: "2026-08-10T00:00:00Z",
        end_at: "2026-08-01T00:00:00Z",
      }).success,
    ).toBe(false);
  });

  it("rejects unknown keys (strict)", () => {
    expect(updateFeaturedContentBodySchema.safeParse({ nope: 1 }).success).toBe(false);
  });
});

describe("recordFeaturedClickBodySchema", () => {
  it("accepts an empty body or a valid destination_type", () => {
    expect(recordFeaturedClickBodySchema.safeParse({}).success).toBe(true);
    expect(recordFeaturedClickBodySchema.safeParse({ destination_type: "internal" }).success).toBe(
      true,
    );
  });

  it("rejects unknown keys and invalid destination types", () => {
    expect(recordFeaturedClickBodySchema.safeParse({ extra: true }).success).toBe(false);
    expect(recordFeaturedClickBodySchema.safeParse({ destination_type: "phone" }).success).toBe(
      false,
    );
  });
});
