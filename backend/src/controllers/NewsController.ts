import type { Request, Response } from "express";

import { asyncHandler } from "@/middleware/async-handler";
import type { NewsService } from "@/services/NewsService";
import { successResponse } from "@/utils/api-response";

export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  getNews = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const items = await this.newsService.listNews();
    successResponse(res, items, "News retrieved.");
  });

  getNewsCategories = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const categories = await this.newsService.listCategories();
    successResponse(res, categories, "News categories retrieved.");
  });
}