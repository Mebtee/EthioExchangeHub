import { queryParam, schemaRef, successResponse, type DocPathItem } from "../helpers";

/** Market-ticker endpoint (mounted under `/api/v1`). */
export const marketTickerPaths: Record<string, DocPathItem> = {
  "/market-ticker": {
    get: {
      tags: ["Exchange Rates"],
      summary: "Get market ticker",
      description:
        "Mean cash buying rate per currency on the newest rate date, with the percent change vs the previous date. Real data derived from the persisted rate rows (scraped + manual overrides, consistent with the resolved rate views) — nothing is fabricated.",
      operationId: "getMarketTicker",
      parameters: [
        queryParam("limit", "Maximum number of currency pairs (default 8).", {
          pattern: "^[1-9]\\d*$",
        }),
      ],
      responses: {
        "200": successResponse("Market ticker retrieved.", {
          type: "array",
          items: schemaRef("MarketTickerItem"),
        }),
        "422": { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
};
