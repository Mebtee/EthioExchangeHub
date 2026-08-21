import type { OpenAPIV3_1 } from "openapi-types";

/** API tags shown in Swagger UI, grouped by domain. */
export const apiTags: OpenAPIV3_1.TagObject[] = [
  { name: "Admin", description: "Administrator profile, settings, and dashboard." },
  { name: "Auth", description: "Administrator authentication (login, tokens, password reset)." },
  { name: "Banks", description: "Bank directory: listing and lookup." },
  { name: "Contact", description: "Public contact-message submissions." },
  {
    name: "Customer API Keys",
    description:
      "Customer API-key self-service (create/list/revoke). Requires a customer bearer token; the full key secret is shown exactly once at creation.",
  },
  { name: "Exchange Rates", description: "Latest and historical exchange rates." },
  { name: "Featured Content", description: "Homepage featured campaign and admin management." },
  { name: "Manual Rates", description: "Human-entered rate overrides." },
  { name: "News", description: "Financial news articles and categories." },
  { name: "Scraper Health", description: "Scraper operational health summary." },
  { name: "Scrape Logs", description: "Append-only scraper run history." },
];
