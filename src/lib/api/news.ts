import { news, newsCategories } from "@/lib/demo-data";
import type { NewsCategory, NewsItem } from "@/types/news";

// TODO(backend): Replace these mocks with real API calls (e.g. GET /news).

export async function fetchNews(): Promise<NewsItem[]> {
  return news;
}

export async function fetchNewsCategories(): Promise<NewsCategory[]> {
  return newsCategories;
}
