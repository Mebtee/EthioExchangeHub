/**
 * Scraper-health validation. `GET /scraper-health` has no inputs; the only
 * route with inputs is `GET /scraper-health/:bankCode`.
 */

import { bankCodeParamsSchema } from "../common";

/** Params for `GET /scraper-health/:bankCode`. */
export const scraperHealthParamsSchema = bankCodeParamsSchema;
