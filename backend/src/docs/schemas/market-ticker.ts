import type { OpenAPIV3_1 } from "openapi-types";

/** One market-ticker row returned by `GET /market-ticker`. */
export const marketTickerItemSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description:
    "Mean cash buying rate per currency on the newest rate date, with the percent change vs the previous date. Derived from the persisted rate rows (scraped + manual overrides).",
  properties: {
    pair: { type: "string", description: "Display pair (e.g. USD/ETB)." },
    value: { type: "number", description: "Mean cash buying rate across banks." },
    change: {
      type: "number",
      description: "Percent change vs the previous rate date (0 when there is no history).",
    },
  },
  required: ["pair", "value", "change"],
};
