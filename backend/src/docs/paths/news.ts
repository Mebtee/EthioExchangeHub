import { arrayRef, successResponse, type DocPathItem } from "../helpers";

/** News endpoints (mounted under `/api/v1`). */
export const newsPaths: Record<string, DocPathItem> = {
  "/news": {
    get: {
      tags: ["News"],
      summary: "List news",
      description:
        "Lists financial-news articles. No news source is wired yet, so this intentionally returns an empty list rather than fabricated articles; the UI renders the empty state.",
      operationId: "listNews",
      responses: {
        "200": successResponse("News retrieved.", arrayRef("NewsItem")),
      },
    },
  },
  "/news/categories": {
    get: {
      tags: ["News"],
      summary: "List news categories",
      description:
        "Lists news categories with article counts. Currently returns an empty list until a real news source is wired.",
      operationId: "listNewsCategories",
      responses: {
        "200": successResponse("News categories retrieved.", arrayRef("NewsCategory")),
      },
    },
  },
};
