import {
  arrayRef,
  nullableRef,
  pathParam,
  schemaRef,
  successResponse,
  type DocPathItem,
} from "../helpers";

/** Scraper-health endpoints (mounted under `/api/v1`). */
export const scraperHealthPaths: Record<string, DocPathItem> = {
  "/scraper-health": {
    get: {
      tags: ["Scraper Health"],
      summary: "Get scraper health summary",
      description:
        "Aggregate health summary and statistics across all scrapers, derived from scrape logs.",
      operationId: "getScraperHealth",
      responses: {
        "200": successResponse(
          "Scraper health summary retrieved.",
          schemaRef("ScraperHealthSummary"),
        ),
      },
    },
  },
  "/scraper-health/list": {
    get: {
      tags: ["Scraper Health"],
      summary: "List scraper health rows",
      description:
        "Every per-bank health row, alphabetical by bank code. Health is derived from scrape logs; banks without logs are absent.",
      operationId: "listScraperHealth",
      responses: {
        "200": successResponse("Scraper health list retrieved.", arrayRef("ScraperHealth")),
      },
    },
  },
  "/scraper-health/{bankCode}": {
    get: {
      tags: ["Scraper Health"],
      summary: "Get scraper health for a bank",
      description: "Returns the health row for one bank, or null when it has no scrape logs yet.",
      operationId: "getScraperHealthByBank",
      parameters: [pathParam("bankCode", "Bank code (e.g. ABY).")],
      responses: {
        "200": successResponse("Scraper health retrieved.", nullableRef("ScraperHealth")),
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
};
