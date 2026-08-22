import type { OpenAPIV3_1 } from "openapi-types";

/** API tags shown in Swagger UI, grouped by domain. */
export const apiTags: OpenAPIV3_1.TagObject[] = [
  { name: "Admin", description: "Administrator profile, settings, and dashboard." },
  {
    name: "Commercial API",
    description:
      "Phase 4 paid data API at `/public/*`. Authentication uses `Authorization: Bearer eeh_live_…` (an API key, NOT a login token). Every request must resolve to an ACTIVE subscription within its billing period; plan RPM and monthly quotas are enforced with 429 responses.",
  },
  {
    name: "Customer Usage",
    description:
      "Customer usage analytics for the commercial API (plan limits, per-period consumption, per-key breakdowns). Requires a customer bearer token.",
  },
  { name: "Auth", description: "Administrator authentication (login, tokens, password reset)." },
  { name: "Banks", description: "Bank directory: listing and lookup." },
  { name: "Contact", description: "Public contact-message submissions." },
  {
    name: "Customer API Keys",
    description:
      "Customer API-key self-service (create/list/revoke). Requires a customer bearer token; the full key secret is shown exactly once at creation.",
  },
  {
    name: "Customer Subscription",
    description:
      "Customer plan catalog and subscription selection (Phase 2C). Free plans activate immediately; paid plans stay pending until bank-transfer approval.",
  },
  {
    name: "Customer Payments",
    description:
      "Manual bank-transfer payments (Phase 3). Customers view active bank accounts, submit payments for pending subscriptions, track status, and upload one receipt per payment.",
  },
  {
    name: "Admin Payments",
    description:
      "Payment review (admin/super_admin). Approving a payment activates its subscription with a fresh monthly period — exactly once.",
  },
  {
    name: "Admin Bank Configuration",
    description:
      "Bank accounts used for manual transfers (admin/super_admin). Only active accounts are visible to customers.",
  },
  { name: "Exchange Rates", description: "Latest and historical exchange rates." },
  { name: "Featured Content", description: "Homepage featured campaign and admin management." },
  { name: "Manual Rates", description: "Human-entered rate overrides." },
  { name: "News", description: "Financial news articles and categories." },
  { name: "Scraper Health", description: "Scraper operational health summary." },
  { name: "Scrape Logs", description: "Append-only scraper run history." },
];
