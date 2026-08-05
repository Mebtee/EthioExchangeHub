import type { OpenAPIV3_1 } from "openapi-types";

/** A news article as served by `GET /news`. */
export const newsItemSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description:
    "A financial-news article. No news source is wired yet, so the endpoint currently returns an empty list — the shape documents the planned contract.",
  properties: {
    id: { type: "string", description: "Article id." },
    title: { type: "string" },
    excerpt: { type: "string" },
    category: { type: "string" },
    date: { type: "string", format: "date" },
    readMinutes: { type: "number" },
    image: { type: "string", format: "uri" },
    featured: { type: "boolean" },
    author: { type: "string" },
    authorRole: { type: "string" },
    authorAvatar: { type: "string", format: "uri" },
  },
  required: ["id", "title", "excerpt", "category", "date", "readMinutes", "image"],
};

/** A news category with its article count, as served by `GET /news/categories`. */
export const newsCategorySchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "A news category and how many articles it contains.",
  properties: {
    name: { type: "string" },
    count: { type: "number" },
  },
  required: ["name", "count"],
};
