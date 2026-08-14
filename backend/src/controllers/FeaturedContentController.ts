import type { Request, Response } from "express";

import { asyncHandler } from "@/middleware/async-handler";
import type {
  FeaturedContentInput,
  FeaturedContentService,
  UpdateFeaturedContentInput,
} from "@/services/FeaturedContentService";
import { successResponse } from "@/utils/api-response";

/**
 * HTTP adapter for featured-content endpoints. Reads params/query/body,
 * delegates to the service, and returns the standard envelope. No business
 * logic here — eligibility, scheduling, and defaults live in the service.
 *
 * The public surface (`getActive`, `recordClick`) is mounted WITHOUT auth;
 * the admin surface (`list`, `getOne`, `create`, `update`, `delete`) is
 * mounted behind `requireAuth` + `requireAdmin` in the composition root, so
 * mutations are never exposed publicly.
 */
export class FeaturedContentController {
  constructor(private readonly featuredContentService: FeaturedContentService) {}

  /** Public: the single currently-eligible campaign (or null when none). */
  getActive = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const item = await this.featuredContentService.getActiveFeaturedContent();
    successResponse(res, item, "Featured content retrieved.");
  });

  /** Public: records a click for a campaign (204-equivalent success envelope). */
  recordClick = asyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const body = req.body as { destination_type?: string } | undefined;
    await this.featuredContentService.recordClick(
      req.params.id,
      body?.destination_type as "internal" | "external" | undefined,
    );
    successResponse(res, null, "Click recorded.");
  });

  /** Admin: every campaign (any state) with aggregate click counts. */
  list = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const items = await this.featuredContentService.listFeaturedContent();
    successResponse(res, items, "Featured content retrieved.");
  });

  /** Admin: a single campaign. */
  getOne = asyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const item = await this.featuredContentService.getFeaturedContent(req.params.id);
    successResponse(res, item, "Featured content retrieved.");
  });

  /** Admin: creates a campaign (201). `created_by` is set server-side. */
  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const item = await this.featuredContentService.createFeaturedContent({
      ...(req.body as FeaturedContentInput),
      created_by: req.user?.id,
    });
    successResponse(res, item, "Featured content created.", 201);
  });

  /** Admin: updates a campaign (200). */
  update = asyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const item = await this.featuredContentService.updateFeaturedContent(
      req.params.id,
      req.body as UpdateFeaturedContentInput,
    );
    successResponse(res, item, "Featured content updated.");
  });

  /** Admin: deletes a campaign (200). */
  delete = asyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    await this.featuredContentService.deleteFeaturedContent(req.params.id);
    successResponse(res, null, "Featured content deleted.");
  });
}
