import type { OpenAPIV3_1 } from "openapi-types";

import { apiExamples } from "../examples";

/** `featured_content` row — the admin CRUD representation. */
export const featuredContentSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description:
    "A featured-content / featured-advertisement campaign. The service layer decides which row is currently eligible for the homepage hero.",
  example: apiExamples.featuredContent,
  properties: {
    id: { type: "string", format: "uuid", description: "Row id." },
    title: { type: "string", description: "Campaign title." },
    description: { type: ["string", "null"], description: "Optional description." },
    image_url: {
      type: "string",
      format: "uri",
      description: "Absolute http(s) URL of the hero image.",
    },
    advertiser_name: { type: ["string", "null"], description: "Optional advertiser label." },
    badge_text: { type: "string", description: 'Badge label (default "FEATURED").' },
    cta_text: { type: "string", description: 'CTA button label (default "Learn More").' },
    destination_url: {
      type: "string",
      description: "Route path (internal) or absolute http(s) URL (external).",
    },
    destination_type: {
      type: "string",
      enum: ["internal", "external"],
      description: "Whether the destination is a client-side route or a website.",
    },
    image_alt: { type: ["string", "null"], description: "Accessibility alt text." },
    is_active: { type: "boolean", description: "Whether the campaign is live." },
    display_order: { type: "integer", minimum: 0, description: "Priority (lower = sooner)." },
    start_at: { type: ["string", "null"], format: "date-time", description: "Schedule start." },
    end_at: { type: ["string", "null"], format: "date-time", description: "Schedule end." },
    created_by: {
      type: ["string", "null"],
      format: "uuid",
      description: "Auth user id that created it.",
    },
    feature_1_icon: { type: ["string", "null"], description: "Bottom-card highlight icon." },
    feature_1_title: { type: ["string", "null"], description: "Bottom-card highlight title." },
    feature_1_description: { type: ["string", "null"], description: "Bottom-card highlight text." },
    feature_2_icon: { type: ["string", "null"], description: "Bottom-card highlight icon." },
    feature_2_title: { type: ["string", "null"], description: "Bottom-card highlight title." },
    feature_2_description: { type: ["string", "null"], description: "Bottom-card highlight text." },
    feature_3_icon: { type: ["string", "null"], description: "Bottom-card highlight icon." },
    feature_3_title: { type: ["string", "null"], description: "Bottom-card highlight title." },
    feature_3_description: { type: ["string", "null"], description: "Bottom-card highlight text." },
    created_at: { type: "string", format: "date-time", description: "Creation timestamp." },
    updated_at: { type: "string", format: "date-time", description: "Last update timestamp." },
  },
  required: ["id", "title", "image_url", "badge_text", "cta_text", "destination_url", "is_active"],
};

/** Admin list item: a campaign row plus its aggregate click count. */
export const featuredContentAdminItemSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "A featured campaign as listed in the admin surface, with its click count.",
  example: { ...apiExamples.featuredContent, click_count: 12 },
  properties: {
    ...featuredContentSchema.properties,
    click_count: { type: "integer", minimum: 0, description: "Total recorded clicks." },
  },
  required: [...(featuredContentSchema.required as string[]), "click_count"],
};

/** The public homepage DTO (`GET /featured`). */
export const activeFeaturedContentSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description:
    "The single currently-eligible campaign served to the homepage hero. Null when nothing is eligible.",
  example: apiExamples.activeFeaturedContent,
  properties: {
    id: { type: "string", format: "uuid", description: "Row id." },
    title: { type: "string", description: "Campaign title." },
    description: { type: ["string", "null"], description: "Optional description." },
    image_url: { type: "string", format: "uri", description: "Absolute http(s) hero image URL." },
    image_alt: { type: ["string", "null"], description: "Accessibility alt text." },
    advertiser_name: { type: ["string", "null"], description: "Optional advertiser label." },
    badge_text: { type: "string", description: "Badge label." },
    cta_text: { type: "string", description: "CTA button label." },
    destination_url: { type: "string", description: "Route path or absolute http(s) URL." },
    destination_type: {
      type: "string",
      enum: ["internal", "external"],
      description: "Whether the destination is a client-side route or a website.",
    },
    features: {
      type: "array",
      description: "Bottom-row highlights (only complete entries).",
      items: {
        type: "object",
        properties: {
          icon: { type: "string", description: "Highlight icon." },
          title: { type: "string", description: "Highlight title." },
          description: { type: "string", description: "Highlight text." },
        },
        required: ["icon", "title", "description"],
      },
    },
  },
  required: [
    "id",
    "title",
    "image_url",
    "badge_text",
    "cta_text",
    "destination_url",
    "destination_type",
    "features",
  ],
};

/** Request body for `POST /admin/featured`. */
export const featuredContentInputSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "Payload for creating a featured campaign.",
  example: apiExamples.featuredContentInput,
  properties: {
    title: { type: "string", maxLength: 200, description: "Campaign title." },
    description: {
      type: ["string", "null"],
      maxLength: 1000,
      description: "Optional description.",
    },
    image_url: {
      type: "string",
      format: "uri",
      description: "Absolute http(s) hero image URL.",
    },
    advertiser_name: {
      type: ["string", "null"],
      maxLength: 200,
      description: "Optional advertiser label.",
    },
    badge_text: {
      type: ["string", "null"],
      maxLength: 40,
      description: 'Badge label (default "FEATURED").',
    },
    cta_text: {
      type: ["string", "null"],
      maxLength: 60,
      description: 'CTA label (default "Learn More").',
    },
    destination_url: {
      type: "string",
      maxLength: 2048,
      description: "Route path (internal) or absolute http(s) URL (external).",
    },
    destination_type: {
      type: "string",
      enum: ["internal", "external"],
      description: "Whether the destination is a client-side route or a website.",
    },
    image_alt: { type: ["string", "null"], maxLength: 200, description: "Accessibility alt text." },
    is_active: { type: "boolean", description: "Whether the campaign is live (default true)." },
    display_order: {
      type: "integer",
      minimum: 0,
      maximum: 9999,
      description: "Priority (default 0).",
    },
    start_at: { type: ["string", "null"], format: "date-time", description: "Schedule start." },
    end_at: { type: ["string", "null"], format: "date-time", description: "Schedule end." },
    feature_1_icon: {
      type: ["string", "null"],
      maxLength: 200,
      description: "Bottom-card highlight icon.",
    },
    feature_1_title: {
      type: ["string", "null"],
      maxLength: 100,
      description: "Bottom-card highlight title.",
    },
    feature_1_description: {
      type: ["string", "null"],
      maxLength: 200,
      description: "Bottom-card highlight text.",
    },
    feature_2_icon: {
      type: ["string", "null"],
      maxLength: 200,
      description: "Bottom-card highlight icon.",
    },
    feature_2_title: {
      type: ["string", "null"],
      maxLength: 100,
      description: "Bottom-card highlight title.",
    },
    feature_2_description: {
      type: ["string", "null"],
      maxLength: 200,
      description: "Bottom-card highlight text.",
    },
    feature_3_icon: {
      type: ["string", "null"],
      maxLength: 200,
      description: "Bottom-card highlight icon.",
    },
    feature_3_title: {
      type: ["string", "null"],
      maxLength: 100,
      description: "Bottom-card highlight title.",
    },
    feature_3_description: {
      type: ["string", "null"],
      maxLength: 200,
      description: "Bottom-card highlight text.",
    },
  },
  required: ["title", "image_url", "destination_url", "destination_type"],
};

/** Request body for `PATCH /admin/featured/{id}` — any subset, at least one field. */
export const featuredContentUpdateInputSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "Payload for updating a featured campaign. At least one field must be provided.",
  properties: featuredContentInputSchema.properties,
};

/** Request body for `POST /featured/{id}/click`. */
export const recordFeaturedClickInputSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "Payload for recording a featured-card click.",
  properties: {
    destination_type: {
      type: "string",
      enum: ["internal", "external"],
      description: "Which destination the visitor activated (optional).",
    },
  },
};
