import { Router } from "express";

import type { NewsController } from "@/controllers/NewsController";

export function newsRouter(controller: NewsController): Router {
  const router = Router();

  router.get("/", controller.getNews);
  router.get("/categories", controller.getNewsCategories);

  return router;
}