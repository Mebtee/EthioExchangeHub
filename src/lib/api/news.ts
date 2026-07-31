import { apiClient } from "./client";
import type { NewsCategory, NewsItem } from "@/types/news";

export async function fetchNews(): Promise<NewsItem[]> {
  const { data } = await apiClient.get<NewsItem[]>("/news");
  return data;
}

export async function fetchNewsCategories(): Promise<NewsCategory[]> {
  const { data } = await apiClient.get<NewsCategory[]>("/news/categories");
  return data;
}
