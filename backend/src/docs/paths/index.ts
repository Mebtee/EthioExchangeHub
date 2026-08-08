import { type DocPathItem } from "../helpers";

import { adminPaths } from "./admin";
import { authPaths } from "./auth";
import { banksPaths } from "./banks";
import { contactPaths } from "./contact";
import { exchangeRatesPaths } from "./exchange-rates";
import { manualRatesPaths } from "./manual-rates";
import { newsPaths } from "./news";
import { scraperHealthPaths } from "./scraper-health";
import { scrapeLogsPaths } from "./scrape-logs";

/**
 * Every documented path, keyed by route. Paths are relative to the `/api/v1`
 * server. The unversioned `/health` endpoint is intentionally NOT listed as a
 * path here (it would resolve to the wrong URL under the `/api/v1` server
 * base); it is mentioned in `info.description` instead.
 */
export const apiPaths: Record<string, DocPathItem> = {
  ...adminPaths,
  ...authPaths,
  ...banksPaths,
  ...contactPaths,
  ...exchangeRatesPaths,
  ...manualRatesPaths,
  ...newsPaths,
  ...scraperHealthPaths,
  ...scrapeLogsPaths,
};
