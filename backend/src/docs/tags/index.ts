import type { OpenAPIV3_1 } from "openapi-types";

/** API tags shown in Swagger UI, grouped by domain. */
export const apiTags: OpenAPIV3_1.TagObject[] = [
  { name: "Banks", description: "Bank directory: listing and lookup." },
  { name: "Exchange Rates", description: "Latest and historical exchange rates." },
  { name: "Manual Rates", description: "Human-entered rate overrides." },
  { name: "Scraper Health", description: "Scraper operational health summary." },
  { name: "Scrape Logs", description: "Append-only scraper run history." },
];
