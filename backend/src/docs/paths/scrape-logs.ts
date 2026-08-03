import { arrayRef, pathParam, queryParam, successResponse, type DocPathItem } from "../helpers";

/** Scrape-log endpoints (mounted under `/api/v1`). */
export const scrapeLogsPaths: Record<string, DocPathItem> = {
  "/scrape-logs": {
    get: {
      tags: ["Scrape Logs"],
      summary: "List scrape logs",
      description: "Lists scraper run history, newest first, with optional filters and pagination.",
      operationId: "listScrapeLogs",
      parameters: [
        queryParam("bankCode", "Bank code (e.g. ABY)."),
        queryParam("runId", "Restrict to one scraper run.", { format: "uuid" }),
        queryParam("status", "Run outcome.", { enum: ["success", "failed"] }),
        queryParam("scenario", "Scenario text (e.g. updated, stale, failed)."),
        queryParam("limit", "Maximum rows to return (>= 1).", { pattern: "^[1-9][0-9]*$" }),
        queryParam("offset", "Rows to skip (>= 0).", { pattern: "^[0-9]+$" }),
      ],
      responses: {
        "200": successResponse("Scrape logs retrieved.", arrayRef("ScrapeLog")),
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/scrape-logs/{runId}": {
    get: {
      tags: ["Scrape Logs"],
      summary: "Get scrape logs for a run",
      description: "Returns all log entries belonging to one scraper run, newest first.",
      operationId: "getScrapeLogsByRunId",
      parameters: [
        pathParam("runId", "Scraper run id.", "uuid"),
        queryParam("limit", "Maximum rows to return (>= 1).", { pattern: "^[1-9][0-9]*$" }),
        queryParam("offset", "Rows to skip (>= 0).", { pattern: "^[0-9]+$" }),
      ],
      responses: {
        "200": successResponse("Scrape logs retrieved.", arrayRef("ScrapeLog")),
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
};
