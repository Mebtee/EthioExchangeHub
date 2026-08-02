import type { Request, Response } from "express";

import { asyncHandler } from "@/middleware/async-handler";
import type {
  ScrapeLogFilter,
  ScrapeLogQueryOptions,
  ScrapeLogsService,
} from "@/services/ScrapeLogsService";
import { successResponse } from "@/utils/api-response";

/**
 * HTTP adapter for scrape-log endpoints. Reads params/query, delegates to the
 * service, and returns the standard envelope. No business logic here.
 */
export class ScrapeLogsController {
  constructor(private readonly scrapeLogsService: ScrapeLogsService) {}

  /** Lists logs, optionally filtered and paginated. */
  getLogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const logs = await this.scrapeLogsService.listLogs(
      ScrapeLogsController.readFilter(req.query),
      ScrapeLogsController.readQueryOptions(req.query),
    );
    successResponse(res, logs, "Scrape logs retrieved.");
  });

  /** Returns all logs belonging to one scraper run. */
  getLogsByRunId = asyncHandler(
    async (req: Request<{ runId: string }>, res: Response): Promise<void> => {
      const logs = await this.scrapeLogsService.getLogsByRun(
        req.params.runId,
        ScrapeLogsController.readQueryOptions(req.query),
      );
      successResponse(res, logs, "Scrape logs retrieved.");
    },
  );

  /** Reads optional filter query params into a log filter (no validation). */
  private static readFilter(query: Request["query"]): ScrapeLogFilter {
    const filter: ScrapeLogFilter = {};
    if (typeof query.bankCode === "string") filter.bankCode = query.bankCode;
    if (typeof query.runId === "string") filter.runId = query.runId;
    if (typeof query.status === "string") filter.status = query.status;
    if (typeof query.scenario === "string") filter.scenario = query.scenario;
    return filter;
  }

  /**
   * Reads optional `limit`/`offset` query params into pagination options.
   * Only coercion — non-numeric values are omitted rather than passed as NaN
   * (business validation of the numbers happens in the validator layer).
   */
  private static readQueryOptions(query: Request["query"]): ScrapeLogQueryOptions {
    const options: ScrapeLogQueryOptions = {};
    if (typeof query.limit === "string") {
      const limit = Number(query.limit);
      if (Number.isFinite(limit)) options.limit = limit;
    }
    if (typeof query.offset === "string") {
      const offset = Number(query.offset);
      if (Number.isFinite(offset)) options.offset = offset;
    }
    return options;
  }
}
