import type { OpenAPIV3_1 } from "openapi-types";

import { apiExamples } from "../examples";

/** `scrape_logs` row — append-only run history. */
export const scrapeLogSchema: OpenAPIV3_1.SchemaObject = {
  type: "object",
  description: "A single scrape-log entry (one bank within one scraper run).",
  example: apiExamples.scrapeLog,
  properties: {
    id: { type: "string", format: "uuid", description: "Row id." },
    run_id: { type: "string", format: "uuid", description: "Groups one run across banks." },
    bank_code: { type: "string", description: "Scraper target bank." },
    status: { type: "string", enum: ["success", "failed"], description: "Run outcome." },
    scenario: { type: "string", description: "e.g. updated, stale, failed." },
    currencies_count: { type: ["number", "null"], description: "Currencies processed." },
    error_message: { type: ["string", "null"] },
    duration_ms: { type: ["number", "null"] },
    ran_at: { type: ["string", "null"], format: "date-time", description: "Run timestamp." },
  },
  required: ["id", "run_id", "bank_code", "status", "scenario"],
};
